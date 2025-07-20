# Baseline 2: Multi-File API & Library Refinement

This document summarizes the state of the `harshal-utilities` project after being upgraded to support multi-file analysis. The project serves as a robust, reusable, and independently distributable service for interacting with the Google Gemini API.

---

### Key Components

1.  **Express API Server (`server/server.js`)**
    *   A clean Express.js server that exposes the `GeminiApiClient`'s functionality through a REST API.
    *   Features two primary endpoints:
        *   `/api/chat`: For text-only conversations.
        *   `/api/chat-with-files`: For multimodal interactions involving one or more file uploads.
    *   The `/api/chat-with-files` endpoint now accepts an array of files, allowing for more complex, multi-document analysis in a single request.
    *   Includes a centralized error handler, robust input validation, and is configured to serve static files from a `public` directory for a future UI.

2.  **Gemini API Client (`gemini/geminiApi.js`)**
    *   The core of the project is a reusable `GeminiApiClient` class.
    *   It handles the complexities of authenticating with Google Cloud (using Application Default Credentials) and constructing requests.
    *   **Environment-Aware Authentication**: The constructor is designed for portability between local development and deployed environments. It checks for a `GOOGLE_APPLICATION_CREDENTIALS_JSON` environment variable. If present, it authenticates using those credentials (ideal for servers like Render). If not, it falls back to using Application Default Credentials, which is ideal for local development.
    *   The `sendMessageWithFile` method has been upgraded to `sendMessageWithFiles`, which now accepts an array of file objects (`{ buffer, mimetype }`). This is a key enhancement that enables consumers like `harshal-agent` to conduct context-aware conversations across multiple documents.
    *   Features excellent, detailed error handling with a custom `GeminiApiError` class to manage API-specific issues like safety blocks or empty responses.

3.  **Configuration & Logging**
    *   **Configuration (`.env`)**: The server is properly configured to load credentials and settings from a `.env` file, with a `.env.example` template for easy setup.
    *   **Logging (`logging/logger.js`)**: Utilizes `pino` for structured, asynchronous logging to both the console (using `pino-pretty` for readability) and a file (`app.log`) for persistence.
    *   **Deployment Configuration**: For deployed environments, authentication can be configured by setting the `GOOGLE_APPLICATION_CREDENTIALS_JSON` environment variable with the contents of the service account JSON key file.

4.  **Testing (`powershell-tests/`)**
    *   A practical testing strategy is established using dedicated PowerShell scripts.
    *   `test-api-text.ps1`: Tests the text-only chat endpoint.
    *   `test-api-file.ps1`: Tests the file upload and analysis endpoint, demonstrating the new multi-file capabilities of the `/api/chat-with-files` endpoint.
    *   The scripts are well-written, using best practices like relative pathing (`$PSScriptRoot`) to be runnable from any location.

---

### Project Structure

```
harshal-utilities/
├── .env
├── .env.example
├── .gitignore
├── gemini/
│   └── geminiApi.js
├── index.js
├── logging/
│   └── logger.js
├── node_modules/
├── package.json
├── pdf/
│   └── parsePdf.js
├── powershell-tests/
│   ├── test-api-file.ps1
│   └── test-api-text.ps1
├── server/
│   └── server.js
└── test-data/
    └── pdf/
        └── Sample_Utility_Bill.pdf
```

---

### How to Run and Test

1.  **Setup**: Create a `.env` file from `.env.example` and fill in your Google Cloud `PROJECT_ID` and `LOCATION`.
2.  **Install**: Run `npm install`.
3.  **Start Server**: Run `npm start`.
4.  **Test**: Open a new PowerShell terminal and run the scripts in the `powershell-tests` directory.
 