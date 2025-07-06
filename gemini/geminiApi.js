import { GoogleAuth } from 'google-auth-library';

/**
 * Custom error for more specific error handling by consumers of the client.
 */
export class GeminiApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.name = 'GeminiApiError';
    this.status = status;
    this.details = details;
  }
}

/**
 * A reusable client for interacting with the Google Vertex AI Gemini API.
 * This client handles authentication and request formation.
 */
export class GeminiApiClient {
  #projectId;
  #location;
  #logger;
  #systemInstruction;
  #defaultTextModel;
  #defaultFileModel;
  #auth;

  /**
   * @param {object} options - The constructor options.
   * @param {string} options.projectId - The Google Cloud project ID.
   * @param {string} options.location - The Google Cloud location (e.g., 'us-central1').
   * @param {import('pino').Logger} options.logger - A Pino logger instance for logging.
   * @param {string} [options.defaultTextModel] - The default model to use for text-only requests.
   * @param {string} [options.defaultFileModel] - The default model to use for file-based requests.
   * @param {string} [options.systemInstruction] - An optional system instruction to guide the model's behavior.
   */
  constructor(options) {
    if (!options.projectId || !options.location) {
      throw new GeminiApiError('projectId and location are required options.', 400);
    }
    if (!options.logger) {
      throw new GeminiApiError('A pino logger instance is a required option.', 400);
    }
    this.#projectId = options.projectId;
    this.#location = options.location;
    this.#logger = options.logger;
    this.#defaultTextModel = options.defaultTextModel;
    this.#defaultFileModel = options.defaultFileModel;
    this.#systemInstruction = options.systemInstruction;
    this.#auth = new GoogleAuth({
      scopes: 'https://www.googleapis.com/auth/cloud-platform'
    });
  }

  async #makeApiCall({ url, requestBody }) { // eslint-disable-line
    // The google-auth-library's request method automatically handles fetching and caching access tokens.
    const authClient = await this.#auth.getClient();
    this.#logger.info({ requestBody }, `Sending request to API: ${url}`);

    let response;
    try {
      response = await authClient.request({
        url,
        method: 'POST',
        body: JSON.stringify(requestBody),
      });
    } catch (error) {
      // This catches errors from the underlying HTTP request (e.g., network errors, malformed requests)
      this.#logger.error({
        name: error.name,
        message: error.message,
        code: error.code,
        response: error.response?.data
      }, 'google-auth-library request failed');
      const status = error.response?.status || 500;
      const details = error.response?.data || { message: 'Underlying request from google-auth-library failed.' };
      throw new GeminiApiError(error.message, status, details);
    }

    // The google-auth-library's GaxiosResponse doesn't have an `ok` property.
    // We check the status code directly.
    if (response.status < 200 || response.status >= 300) {
      // The error data is already parsed in `response.data`.
      const errorResponse = response.data;
      this.#logger.error({ errorResponse, status: response.status }, 'API call failed.');
      throw new GeminiApiError(`API call failed with status ${response.status}`, response.status, errorResponse);
    }

    // The response from authClient.request is not a standard fetch Response,
    // so we access the data directly.
    const result = response.data;
    this.#logger.info({ result }, 'Successfully received API response.');

    // The API can return a 200 OK with an error object in the body, or an empty response.
    if (!result) {
      this.#logger.error({ status: response.status }, 'API call succeeded but returned an empty response body.');
      throw new GeminiApiError('API call succeeded but returned an empty response body.', 500, { responseData: result });
    }

    if (result.error) {
      this.#logger.error({ error: result.error }, 'API returned an error object in the response body.');
      throw new GeminiApiError(result.error.message || 'API returned an error.', result.error.code || 500, result.error.details);
    }

    // Handle cases where the API returns a 200 but with no valid candidates (e.g., safety blocks)
    if (!result.candidates || result.candidates.length === 0) {
      const blockReason = result.promptFeedback?.blockReason || 'No candidates returned';
      const safetyRatings = result.promptFeedback?.safetyRatings || [];
      this.#logger.warn({ promptFeedback: result.promptFeedback }, 'API returned no candidates.');
      throw new GeminiApiError(`Request was blocked or no content was generated. Reason: ${blockReason}`, 400, { blockReason, safetyRatings });
    }

    const candidate = result.candidates[0];

    // Handle cases where a candidate is returned but has no content parts.
    if (!candidate.content || !candidate.content.parts || candidate.content.parts.length === 0) {
      const finishReason = candidate.finishReason || 'NO_CONTENT';
      this.#logger.warn({ candidate }, `API returned a candidate with no content parts. Finish reason: ${finishReason}`);
      throw new GeminiApiError(`The model returned a candidate with no content. Finish reason: ${finishReason}`, 400, { finishReason, safetyRatings: candidate.safetyRatings });
    }

    // Return the first content part, which could be text or a function call.
    // The caller is responsible for interpreting it.
    return result.candidates[0].content.parts[0];
  }

  /**
   * Sends a text-only message to the Gemini API.
   * @param {string} userInput The user's message.
   * @param {Array<object>} history The conversation history.
   * @param {string} [modelName] - The name of the model to use, overriding the default.
   * @param {Array<object>} [tools] - Optional. A list of function declarations for the model to use.
   * @returns {Promise<object>} The model's response part, containing either text or a functionCall.
   */
  async sendMessage(userInput, history, modelName, tools) {
    const modelToUse = modelName || this.#defaultTextModel;
    if (!modelToUse) {
      throw new GeminiApiError('No modelName provided and no defaultTextModel is configured.', 400);
    }
    const url = `https://${this.#location}-aiplatform.googleapis.com/v1beta1/projects/${this.#projectId}/locations/${this.#location}/publishers/google/models/${modelToUse}:generateContent`;
    const contents = [...history, { role: 'user', parts: [{ text: userInput }] }];
    const requestBody = { contents };

    if (this.#systemInstruction) {
      requestBody.systemInstruction = { parts: [{ text: this.#systemInstruction }] };
      if (history.length === 0) {
        this.#logger.info(`Using system instruction: "${this.#systemInstruction.substring(0, 70)}..."`);
      }
    }

    if (tools) {
      requestBody.tools = tools;
    }

    return this.#makeApiCall({ url, requestBody });
  }

  /**
   * Sends a message and a file to the Gemini API.
   * @param {string} userInput The user's text message.
   * @param {Array<object>} history The conversation history.
   * @param {string} fileBase64 - The base64-encoded file data.
   * @param {string} fileMimeType - The MIME type of the file.
   * @param {string} [modelName] - The name of the model to use, overriding the default.
   * @param {Array<object>} [tools] - Optional. A list of function declarations for the model to use.
   * @returns {Promise<object>} The model's response part, containing either text or a functionCall.
   */
  async sendMessageWithFile(userInput, history, fileBase64, fileMimeType, modelName, tools) {
    const modelToUse = modelName || this.#defaultFileModel;
    if (!modelToUse) {
      throw new GeminiApiError('No modelName provided and no defaultFileModel is configured.', 400);
    }
    const url = `https://${this.#location}-aiplatform.googleapis.com/v1beta1/projects/${this.#projectId}/locations/${this.#location}/publishers/google/models/${modelToUse}:generateContent`;

    // If userInput is empty, provide a default prompt. Otherwise, use the user's input.
    // This ensures a non-empty text part is always sent, as required by the API for multimodal requests.
    const textPrompt = userInput || 'What is in this file?';

    const requestBody = {
      contents: [...history, {
        role: 'user',
        parts: [
          { text: textPrompt },
          { inlineData: { mimeType: fileMimeType, data: fileBase64 } }
        ]
      }]
    };

    if (this.#systemInstruction) {
      requestBody.systemInstruction = { parts: [{ text: this.#systemInstruction }] };
      if (history.length === 0) {
        this.#logger.info(`Using system instruction for file-based chat: "${this.#systemInstruction.substring(0, 70)}..."`);
      }
    }

    if (tools) {
      requestBody.tools = tools;
    }

    return this.#makeApiCall({ url, requestBody });
  }
}