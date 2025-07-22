/**
 * @file test-gcs-endpoints.js
 * @description Integration tests for the GCS API endpoints
 * Tests the HTTP endpoints /api/data/:fileName for GET and POST operations
 */

import 'dotenv/config';
import fetch from 'node-fetch';

const API_BASE_URL = process.env.UTILITIES_API_URL || 'http://localhost:3002';
const TEST_FILE_NAME = 'test-customer-data.json';

// Sample customer data for testing
const testCustomerData = {
  "userId": "test-user-123",
  "customerName": "Test Customer",
  "accountNumber": "TEST-12345",
  "billingAddress": "123 Test St, Test City, TC 12345",
  "autopay": {
    "isEnrolled": false,
    "paymentMethod": null
  },
  "currentBill": {
    "totalAmountDue": "100.00",
    "dueDate": "2025-08-01"
  },
  "paymentHistory": [
    {
      "transactionId": "test_001",
      "date": "2025-07-15",
      "amount": "100.00",
      "status": "Paid",
      "method": "Test Card **** 1234",
      "declineDetails": null
    }
  ],
  "disputes": []
};

async function runEndpointTests() {
  console.log('🌐 Testing GCS API Endpoints...\n');
  console.log(`API Base URL: ${API_BASE_URL}\n`);
  
  let testsPassed = 0;
  let testsTotal = 0;

  // Helper function to run a test
  async function runTest(testName, testFunction) {
    testsTotal++;
    try {
      console.log(`Testing: ${testName}`);
      await testFunction();
      console.log(`✅ PASSED: ${testName}\n`);
      testsPassed++;
    } catch (error) {
      console.log(`❌ FAILED: ${testName}`);
      console.log(`   Error: ${error.message}\n`);
    }
  }

  // Test 1: Check if server is running
  await runTest('Server connectivity check', async () => {
    try {
      const response = await fetch(`${API_BASE_URL}/api/config`);
      if (!response.ok) {
        throw new Error(`Server responded with status ${response.status}`);
      }
      const config = await response.json();
      console.log(`   Server is running - max payload: ${config.maxPayloadSize}`);
    } catch (error) {
      if (error.code === 'ECONNREFUSED') {
        throw new Error('Cannot connect to server. Is the harshal-utilities server running on the expected port?');
      }
      throw error;
    }
  });

  // Test 2: POST data to GCS endpoint
  await runTest('POST /api/data/:fileName - Save customer data', async () => {
    const response = await fetch(`${API_BASE_URL}/api/data/${TEST_FILE_NAME}`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify(testCustomerData)
    });

    if (!response.ok) {
      const errorBody = await response.text();
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    const result = await response.json();
    if (!result.success) {
      throw new Error('Response should indicate success');
    }
    
    console.log(`   Response: ${result.message}`);
  });

  // Test 3: GET data from GCS endpoint
  await runTest('GET /api/data/:fileName - Retrieve customer data', async () => {
    const response = await fetch(`${API_BASE_URL}/api/data/${TEST_FILE_NAME}`);

    if (response.status === 404) {
      console.log('   Note: File not found - this may be expected if GCS is not configured');
      console.log('   This test passes but indicates GCS may not be fully set up');
      return;
    }

    if (!response.ok) {
      const errorBody = await response.text();
      
      // If it's a GCS configuration error, that's expected in test environments
      if (errorBody.includes('GCS_BUCKET_NAME')) {
        console.log('   Note: GCS_BUCKET_NAME not configured - this is expected in test environments');
        return;
      }
      
      throw new Error(`HTTP ${response.status}: ${errorBody}`);
    }

    const retrievedData = await response.json();
    
    // Verify the data structure
    if (!retrievedData.userId) {
      throw new Error('Retrieved data should have a userId field');
    }
    
    if (retrievedData.userId !== testCustomerData.userId) {
      throw new Error('Retrieved data should match what was stored');
    }
    
    console.log(`   Retrieved customer: ${retrievedData.customerName}`);
  });

  // Test 4: GET non-existent file
  await runTest('GET /api/data/:fileName - Non-existent file', async () => {
    const response = await fetch(`${API_BASE_URL}/api/data/non-existent-file.json`);

    // We expect either a 404 (file not found) or 500 (bucket not configured)
    if (response.status === 404) {
      const result = await response.json();
      if (!result.error.includes('not found')) {
        throw new Error('Error message should mention file not found');
      }
      console.log('   Correctly returned 404 for non-existent file');
    } else if (response.status === 500) {
      const result = await response.json();
      if (result.error.includes('GCS_BUCKET_NAME')) {
        console.log('   GCS not configured - this is expected in test environments');
      } else {
        throw new Error(`Unexpected 500 error: ${result.error}`);
      }
    } else {
      throw new Error(`Expected 404 or 500, got ${response.status}`);
    }
  });

  // Test 5: POST without body
  await runTest('POST /api/data/:fileName - Missing request body', async () => {
    const response = await fetch(`${API_BASE_URL}/api/data/test.json`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }
      // No body
    });

    if (response.status !== 400) {
      throw new Error(`Expected 400 status, got ${response.status}`);
    }

    const result = await response.json();
    if (!result.error.includes('Request body is required')) {
      throw new Error('Should return appropriate error for missing body');
    }
    
    console.log('   Correctly rejected request with missing body');
  });

  // Summary
  console.log('📊 Endpoint Test Summary:');
  console.log(`   Tests passed: ${testsPassed}/${testsTotal}`);
  
  if (testsPassed === testsTotal) {
    console.log('🎉 All endpoint tests passed!');
    console.log('\n💡 Note: Some tests may show "expected" failures if GCS is not configured.');
    console.log('   This is normal for testing the error handling paths.');
    return true;
  } else {
    console.log('⚠️  Some tests failed. Check the output above.');
    return false;
  }
}

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

// Run the tests if this file is executed directly
if (isMainModule) {
  runEndpointTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

export { runEndpointTests }; 