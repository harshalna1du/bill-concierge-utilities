# Project: `harshal-utilities`

**Version:** 3.0 (Contest Demo)

## 1. Project Purpose

The `harshal-utilities` project is a dedicated, reusable, and independently deployable microservice. It acts as the "hands" of the AI assistant, serving as a secure and robust proxy for all direct communication with Google Cloud services.

Its sole responsibility is to handle the implementation details of external APIs, allowing the `harshal-agent` to focus purely on conversational logic.

---

## 2. Core Responsibilities & Components

### 2.1. Google Gemini API Proxy
-   **Component**: `gemini/geminiApi.js`
-   **Endpoint**: `POST /api/chat`
-   **Function**: Receives a prompt from the `harshal-agent`, makes an authenticated call to the Google Gemini API, and returns the model's response.

### 2.2. Google Cloud Storage (GCS) Wrapper
-   **Component**: `gcs/gcs-utils.js`
-   **Endpoints**:
    -   `GET /api/data/:fileName`: Reads a specified file (e.g., `customer-data.json`) from the GCS bucket.
    -   `POST /api/data/:fileName`: Saves data to a specified file in the GCS bucket.

### 2.3. Health Check
-   **Endpoint**: `GET /api/health`
-   **Function**: Provides a diagnostic endpoint to verify that all required environment variables are correctly configured and visible to the running service. This is crucial for debugging deployment issues.

---

## 3. Authentication

The service uses Google's **Application Default Credentials (ADC)** strategy, making it portable between local development and production without code changes.
-   **Local Development**: It automatically uses credentials from running `gcloud auth application-default login` or from a service account key file path specified in the `GOOGLE_APPLICATION_CREDENTIALS` environment variable within the `.env` file.
-   **Production (Render.com)**: It uses the full JSON content of a service account key provided in the `GOOGLE_APPLICATION_CREDENTIALS_JSON` environment variable.

---

## 4. Local Development Setup

### Step 1: Configure Environment
Copy the example configuration file to create your local `.env` file.
```bash
cp env.example .env
```
Ensure the `.env` file points to your service account key file, for example:
`GOOGLE_APPLICATION_CREDENTIALS="C:\\path\\to\\your\\keyfile.json"`

### Step 2: Install Dependencies
```bash
npm install
```

### Step 3: Run the Server
The development server uses `nodemon` for auto-restarting and `pino-pretty` for human-readable logs.
```bash
npm run dev
```
The server will be available at `http://localhost:3002`.

---

## 5. Testing

The project includes a comprehensive test suite to validate its functionality.

### Running All Tests
With the server running in one terminal, open a second terminal and run:
```bash
npm run test:gcs
```
This script validates both the GCS utility functions in isolation and the live API endpoints.

### Live Bucket Verification
To perform a full end-to-end test that writes to and reads from your actual GCS bucket, run:
```bash
npm run test:gcs-live
```
This is the best way to confirm your authentication and IAM permissions are configured correctly.


---
