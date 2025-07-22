/**
 * @file test-gcs-utils.js
 * @description Unit tests for the GCS utility functions
 * This test file focuses on testing the core functionality of getFile and saveFile
 * with mock scenarios and error handling.
 */

import 'dotenv/config';
import { getFile, saveFile } from '../gcs/gcs-utils.js';

const TEST_BUCKET = process.env.GCS_BUCKET_NAME || 'vertex-ai-hnaidu-contest-demo';
const TEST_FILE = 'test-customer-data.json';

// Sample test data
const sampleCustomerData = {
  "userId": "test-user-123",
  "customerName": "Test Customer",
  "accountNumber": "TEST-ACCOUNT",
  "paymentHistory": [
    {
      "transactionId": "test_transaction",
      "date": "2025-01-01",
      "amount": "100.00",
      "status": "Paid"
    }
  ]
};

async function runTests() {
  console.log('🧪 Testing GCS Utilities...\n');
  
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

  // Test 1: Input validation for getFile
  await runTest('getFile - Input validation (empty bucket name)', async () => {
    try {
      await getFile('', 'test.json');
      throw new Error('Should have thrown an error for empty bucket name');
    } catch (error) {
      if (!error.message.includes('bucketName must be a non-empty string')) {
        throw new Error(`Wrong error message: ${error.message}`);
      }
    }
  });

  // Test 2: Input validation for getFile (empty file name)
  await runTest('getFile - Input validation (empty file name)', async () => {
    try {
      await getFile('test-bucket', '');
      throw new Error('Should have thrown an error for empty file name');
    } catch (error) {
      if (!error.message.includes('fileName must be a non-empty string')) {
        throw new Error(`Wrong error message: ${error.message}`);
      }
    }
  });

  // Test 3: Input validation for saveFile
  await runTest('saveFile - Input validation (invalid data type)', async () => {
    try {
      await saveFile('test-bucket', 'test.json', { invalid: 'object' });
      throw new Error('Should have thrown an error for non-string data');
    } catch (error) {
      if (!error.message.includes('data must be a string')) {
        throw new Error(`Wrong error message: ${error.message}`);
      }
    }
  });

  // Test 4: Test data serialization
  await runTest('Data serialization test', async () => {
    const jsonString = JSON.stringify(sampleCustomerData);
    if (typeof jsonString !== 'string') {
      throw new Error('JSON.stringify should return a string');
    }
    
    const parsedData = JSON.parse(jsonString);
    if (parsedData.userId !== sampleCustomerData.userId) {
      throw new Error('Data should round-trip correctly through JSON serialization');
    }
  });

  // Test 5: Environment variable handling
  await runTest('Environment configuration check', async () => {
    const hasCredentials = !!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON;
    const hasProjectId = !!process.env.PROJECT_ID;
    
    console.log(`   - Has GOOGLE_APPLICATION_CREDENTIALS_JSON: ${hasCredentials}`);
    console.log(`   - Has PROJECT_ID: ${hasProjectId}`);
    console.log(`   - Test bucket: ${TEST_BUCKET}`);
    
    // This test always passes, it's just informational
  });

  // Summary
  console.log('📊 Test Summary:');
  console.log(`   Tests passed: ${testsPassed}/${testsTotal}`);
  
  if (testsPassed === testsTotal) {
    console.log('🎉 All unit tests passed!');
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
  runTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error);
      process.exit(1);
    });
}

export { runTests }; 