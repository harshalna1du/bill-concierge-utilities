import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import {
  fileURLToPath
} from 'url';
import pino from 'pino';
import {
  GeminiApiClient,
  GeminiApiError
} from '../gemini/geminiApi.js';

const DEFAULT_TEXT_MODEL = 'gemini-2.5-flash';
const DEFAULT_VISION_MODEL = 'gemini-2.5-flash';
const DEFAULT_MAX_PAYLOAD_SIZE = '10mb';

const logger = pino();

// Initialize Gemini Client
if (!process.env.PROJECT_ID || !process.env.LOCATION) {
  logger.fatal('PROJECT_ID and LOCATION environment variables are required in your .env file.');
  process.exit(1);
}

const geminiClient = new GeminiApiClient({
  projectId: process.env.PROJECT_ID,
  location: process.env.LOCATION,
  defaultTextModel: process.env.MODEL_NAME || DEFAULT_TEXT_MODEL,
  defaultFileModel: process.env.FILE_MODEL_NAME || DEFAULT_VISION_MODEL,
  systemInstruction: process.env.SYSTEM_INSTRUCTION,
  logger: logger.child({
    component: 'GeminiApiClient'
  })
});

const app = express();
const PORT = process.env.PORT || 3002;

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(express.json({
  limit: process.env.MAX_PAYLOAD_SIZE || DEFAULT_MAX_PAYLOAD_SIZE
}));
app.use(cookieParser());

// Serve static files (like index.html and client.js) from the 'public' directory
app.use(express.static(path.join(__dirname, '..', 'public')));

// API Routes needed by client.js
app.get('/api/config', (req, res) => {
  logger.info('Serving client configuration');
  res.json({
    maxPayloadSize: process.env.MAX_PAYLOAD_SIZE || DEFAULT_MAX_PAYLOAD_SIZE
  });
});

app.post('/api/chat', async (req, res, next) => {
  const {
    userInput,
    history = []
  } = req.body;
  if (!userInput) {
    return res.status(400).json({
      error: 'userInput is required.'
    });
  }

  try {
    logger.info({
      userInput,
      historyLength: history.length
    }, 'Received chat request');
    const modelResponsePart = await geminiClient.sendMessage(userInput, history);
    const responseText = modelResponsePart.text || '';
    // Send back in the format the agent expects
    res.json({
      text: responseText
    });
  } catch (error) {
    next(error);
  }
});

app.post('/api/chat-with-files', async (req, res, next) => {
  // *** THE FIRST FIX IS HERE ***
  // We now correctly look for a 'prompt' property from the agent,
  // falling back to 'userInput' for other potential callers.
  const {
    prompt = req.body.userInput, history = [], files
  } = req.body;

  if (!files || !Array.isArray(files) || files.length === 0) {
    return res.status(400).json({
      error: 'A non-empty "files" array is required.'
    });
  }

  try {
    logger.info({
      prompt,
      fileCount: files.length,
      historyLength: history.length
    }, 'Received chat request with files');

    const filesForApi = files.map(file => {
      if (!file.fileBase64 || !file.fileMimeType) {
        throw new GeminiApiError('Each file object in the "files" array must have "fileBase64" and "fileMimeType" properties.', 400);
      }
      return {
        buffer: Buffer.from(file.fileBase64, 'base64'),
        mimetype: file.fileMimeType
      };
    });

    // We pass the detailed `prompt` to the Gemini client.
    const modelResponsePart = await geminiClient.sendMessageWithFiles(prompt, history, filesForApi);
    const responseText = modelResponsePart.text || '';

    // *** THE SECOND FIX IS HERE ***
    // Send the response back in a { "text": "..." } object to match
    // the contract expected by the harshal-agent service.
    res.json({
      text: responseText
    });
  } catch (error) {
    next(error);
  }
});

// Centralized API error handler
app.use('/api', (err, req, res, next) => {
  logger.error(err, `Error in ${req.method} ${req.path}`);
  if (err instanceof GeminiApiError) {
    return res.status(err.status || 500).json({
      error: err.message,
      details: err.details
    });
  }
  res.status(500).json({
    error: 'An unexpected error occurred.'
  });
});

app.listen(PORT, () => {
  logger.info(`Server is running on http://localhost:${PORT}`);
});
