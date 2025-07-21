# Project Summary: `bill-concierge-utilities`

**Version:** 2.0 (Contest Submission)
**Date:** 2025-07-21

## 1. Project Purpose

The `bill-concierge-utilities` project is a dedicated, reusable, and independently deployable microservice responsible for all direct communication with the Google Gemini API. It acts as a secure and robust wrapper, abstracting away the complexities of AI model interaction from the main application logic.

---

## 2. Key Components

1.  **Express API Server (`server/server.js`)**:
    * A clean Express.js server that exposes the `GeminiApiClient`'s functionality through a REST API.
    * **Contract-Driven Endpoint**: Features a primary endpoint, `POST /api/chat-with-files`, designed to accept a specific contract from the `bill-concierge-agent`. It correctly receives the detailed `prompt`, conversation `history`, and `files` data and passes them to the Gemini client.
    * **Deployment Ready**: The server is configured to listen on the `PORT` environment variable provided by the hosting platform (e.g., Render), falling back to a default port for local development.

2.  **Gemini API Client (`gemini/geminiApi.js`)**:
    * The core of the project is a reusable `GeminiApiClient` class.
    * **Environment-Aware Authentication**: The client's authentication is robust and flexible. It automatically uses local Application Default Credentials (ADC) for development but can be configured with a `GOOGLE_APPLICATION_CREDENTIALS_JSON` environment variable for deployed environments, making it highly portable.
    * It handles the complexities of constructing requests for the Gemini API, including handling multiple file parts.

3.  **Configuration & Logging**:
    * **Configuration (`.env`)**: All configuration (Project ID, Location, Model Names) is managed via environment variables, with a `.env.example` file for easy setup. This follows the 12-factor app methodology for clean separation of config from code.
    * **Logging**: Utilizes `pino` for structured, asynchronous logging.

---

## 3. Project Structure


bill-concierge-utilities/
├── .env
├── .env.example
├── .gitignore
├── gemini/
│   └── geminiApi.js
├── package.json
├── server/
│   └── server.js
└── test-data/
└── pdf/
└── Bill1.pdf


---

## 4. Current State

The `bill-concierge-utilities` service is stable, fully tested, and successfully deployed on Render. It correctly serves its purpose as the core AI interaction layer of the application, reliably handling requests from the `bill-concierge-agent` and communicating with the Gemini API.
