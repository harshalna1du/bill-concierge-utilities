import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import path from 'path';
import { fileURLToPath } from 'url';
import { GeminiApiClient, GeminiApiError } from '../gemini/geminiApi.js';
import { createLogger } from '../logging/logger.js';

const DEFAULT_TEXT_MODEL = 'gemini-1.5-flash-001';
const DEFAULT_VISION_MODEL = 'gemini-1.5-flash-001';
const DEFAULT_MAX_PAYLOAD_SIZE = '10mb';

const logger = createLogger();

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
  logger: logger.child({ component: 'GeminiApiClient' })
});

const app = express();
const port = process.env.PORT || 3000;

// ES Module equivalent for __dirname
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Middlewares
app.use(express.json({ limit: process.env.MAX_PAYLOAD_SIZE || DEFAULT_MAX_PAYLOAD_SIZE }));
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
  // For simplicity, we are not persisting history on the server between requests.
  const { userInput, history = [] } = req.body;
  if (!userInput) {
    return res.status(400).json({ error: 'userInput is required.' });
  }

  try {
    logger.info({ userInput, historyLength: history.length }, 'Received chat request');
    const modelResponsePart = await geminiClient.sendMessage(userInput, history);
    const modelResponse = modelResponsePart.text || '';
    res.json({ modelResponse });
  } catch (error) {
    next(error);
  }
});

app.post('/api/chat-with-file', async (req, res, next) => {
  const { userInput, history = [], fileBase64, fileMimeType } = req.body;

  if (!fileBase64 || !fileMimeType) {
    return res.status(400).json({ error: 'fileBase64 and fileMimeType are required.' });
  }

  try {
    logger.info({ userInput, mimeType: fileMimeType, historyLength: history.length }, 'Received chat request with file');
    const modelResponsePart = await geminiClient.sendMessageWithFile(userInput, history, fileBase64, fileMimeType);
    const modelResponse = modelResponsePart.text || '';
    res.json({ modelResponse });
  } catch (error) {
    next(error);
  }
});

// Centralized API error handler
app.use('/api', (err, req, res, next) => {
  logger.error(err, `Error in ${req.method} ${req.path}`);
  if (err instanceof GeminiApiError) {
    return res.status(err.status || 500).json({ error: err.message, details: err.details });
  }
  res.status(500).json({ error: 'An unexpected error occurred.' });
});

app.listen(port, () => {
  logger.info(`Server is running on http://localhost:${port}`);
});