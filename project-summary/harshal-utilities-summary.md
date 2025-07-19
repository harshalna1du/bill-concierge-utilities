# Baseline 1: Initial Project Setup & API Server

This document summarizes the state of the `harshal-utilities` project at the completion of the initial setup. The project is a functional Node.js backend service for interacting with the Google Gemini API.

---

### Key Components

1.  **Express API Server (`server/server.js`)**
    *   A clean Express.js server that exposes the Gemini client's functionality through a REST API.
    *   Features two primary endpoints:
        *   `/api/chat`: For text-only conversations.
        *   `/api/chat-with-file`: For multimodal interactions involving file uploads.
    *   Includes a centralized error handler, robust input validation, and is configured to serve static files from a `public` directory for a future UI.

2.  **Gemini API Client (`gemini/geminiApi.js`)**
    *   The core of the project is a reusable `GeminiApiClient` class.
    *   It handles the complexities of authenticating with Google Cloud (using Application Default Credentials) and constructing requests.
    *   Features excellent, detailed error handling with a custom `GeminiApiError` class to manage API-specific issues like safety blocks or empty responses.

3.  **Configuration & Logging**
    *   **Configuration (`.env`)**: The server is properly configured to load credentials and settings from a `.env` file, with a `.env.example` template for easy setup.
    *   **Logging (`logging/logger.js`)**: Utilizes `pino` for structured, asynchronous logging to both the console (using `pino-pretty` for readability) and a file (`app.log`) for persistence.

4.  **Testing (`powershell-tests/`)**
    *   A practical testing strategy is established using dedicated PowerShell scripts.
    *   `test-api-text.ps1`: Tests the text-only chat endpoint.
    *   `test-api-file.ps1`: Tests the file upload and analysis endpoint, demonstrating the multimodal capabilities.
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