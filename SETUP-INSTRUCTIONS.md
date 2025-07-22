# Quick Setup Instructions

## 🚀 Get Started in 3 Steps

### 1. **Set up Environment Configuration**
```bash
# Copy the example configuration
cp env.example .env
```
This creates a `.env` file with your actual Google Cloud project settings:
- **Project ID**: `vertex-ai-studio-464114`
- **GCS Bucket**: `vertex-ai-hnaidu-contest-demo`

### 2. **Authenticate with Google Cloud**
```bash
# Authenticate for local development
gcloud auth application-default login
```
This allows the application to access your GCS bucket using your credentials.

### 3. **Install and Test**
```bash
# Install dependencies
npm install

# Start the server (Terminal 1)
npm run dev

# Run tests (Terminal 2)
npm run test:gcs
```

## ✅ Expected Results

You should see:
```
🧪 GCS Test Suite for harshal-utilities
🔧 Environment Configuration:
   PROJECT_ID: vertex-ai-studio-464114
   GCS_BUCKET_NAME: vertex-ai-hnaidu-contest-demo
   Has Google credentials: true

🎉 ALL GCS TESTS PASSED!
```

## 🔧 Test Individual Components

```bash
# Test just the utilities (no server needed)
npm run test:gcs-utils

# Test just the API endpoints (server must be running)  
npm run test:gcs-endpoints

# Test with ACTUAL GCS bucket (recommended after setup)
npm run test:gcs-live

# PowerShell alternative
.\powershell-tests\test-gcs-endpoints.ps1
```

## 🌐 Live Bucket Testing

After setting up your `.env` file and authentication, run the live test:

```bash
npm run test:gcs-live
```

This will:
- ✅ Save your customer data to the actual `vertex-ai-hnaidu-contest-demo` bucket
- ✅ Read it back and verify the data integrity  
- ✅ Test error handling with non-existent files
- ✅ Clean up test files
- ✅ Confirm your authentication and permissions are working

## 🛠️ Troubleshooting

### Authentication Issues
```bash
# Re-authenticate if needed
gcloud auth application-default login --project vertex-ai-studio-464114
```

### Verify Bucket Access
```bash
# Test bucket access directly
gcloud --project vertex-ai-studio-464114 storage ls gs://vertex-ai-hnaidu-contest-demo/
```

### Check Server Status
```bash
# Make sure server is running on port 3002
curl http://localhost:3002/api/config
```

---

🎯 **Ready for Phase 2!** Once these tests pass, you can proceed to implement the Flow Engine in `harshal-agent`. 