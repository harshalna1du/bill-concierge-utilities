import 'dotenv/config';
import express from 'express';
import cookieParser from 'cookie-parser';
import cors from 'cors';
import path from 'path';
import {
  fileURLToPath
} from 'url';
import pino from 'pino';
import {
  GeminiApiClient,
  GeminiApiError
} from '../gemini/geminiApi.js';
import {
  getFile,
  saveFile,
  GCSFileNotFoundError
} from '../gcs/gcs-utils.js';

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

// --- CORS Configuration ---
// In a production environment, it's a world-class practice to explicitly
// whitelist the origins that are allowed to make requests. This is more
// secure than allowing all origins ('*').
const allowedOrigins = [
    'https://bill-concierge-agent.onrender.com', // Deployed Agent
    'http://localhost:3001'                      // Local development Agent
];

const corsOptions = {
    origin: function (origin, callback) {
        // Allow requests with no origin (like mobile apps or curl requests)
        if (!origin || allowedOrigins.indexOf(origin) !== -1) {
            callback(null, true);
        } else {
            callback(new Error('Not allowed by CORS'));
        }
    },
    optionsSuccessStatus: 200 // For legacy browser support
};

// Middlewares
app.use(cors(corsOptions));
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

// --- Health Check Endpoint ---
// A world-class practice for microservices is to have a health check
// endpoint for observability and debugging.
app.get('/api/health', (req, res) => {
  const checks = {
    gcsBucket: {
      value: process.env.GCS_BUCKET_NAME || 'Not Set',
      status: process.env.GCS_BUCKET_NAME ? 'OK' : 'MISSING'
    },
    projectId: {
      value: process.env.PROJECT_ID || 'Not Set',
      status: process.env.PROJECT_ID ? 'OK' : 'MISSING'
    },
    googleCredentials: {
      status: (process.env.GOOGLE_APPLICATION_CREDENTIALS || process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON) ? 'OK' : 'MISSING'
    }
  };

  const isHealthy = Object.values(checks).every(check => check.status === 'OK');

  logger.info({ healthStatus: checks }, 'Health check performed.');

  res.status(isHealthy ? 200 : 500).json({
    status: isHealthy ? 'OK' : 'ERROR',
    checks,
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

// GCS Data API Endpoints
app.get('/api/data/:fileName', async (req, res, next) => {
  const { fileName } = req.params;
  const bucketName = process.env.GCS_BUCKET_NAME;

  if (!bucketName) {
    return res.status(500).json({
      error: 'GCS_BUCKET_NAME environment variable is not configured'
    });
  }

  try {
    logger.info({ fileName, bucketName }, 'Fetching file from GCS');
    const fileContent = await getFile(bucketName, fileName);
    
    // Return the file contents with application/json content type
    res.setHeader('Content-Type', 'application/json');
    res.send(fileContent);
  } catch (error) {
    logger.error({ err: error, fileName, bucketName }, 'Failed to fetch file from GCS');
    if (error instanceof GCSFileNotFoundError) {
      return res.status(404).json({ error: error.message });
    }
    next(error);
  }
});

app.post('/api/data/:fileName', async (req, res, next) => {
  const { fileName } = req.params;
  const bucketName = process.env.GCS_BUCKET_NAME;

  if (!bucketName) {
    return res.status(500).json({
      error: 'GCS_BUCKET_NAME environment variable is not configured'
    });
  }

  if (!req.body || Object.keys(req.body).length === 0) {
    return res.status(400).json({
      error: 'Request body is required'
    });
  }

  try {
    logger.info({ fileName, bucketName }, 'Saving file to GCS');
    
    // Convert the request body to a JSON string
    const dataString = JSON.stringify(req.body);
    await saveFile(bucketName, fileName, dataString);
    
    res.status(200).json({
      success: true,
      message: `File '${fileName}' saved successfully`
    });
  } catch (error) {
    logger.error({ err: error, fileName, bucketName }, 'Failed to save file to GCS');
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
