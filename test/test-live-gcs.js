/**
 * @file test-live-gcs.js  
 * @description Live test for actual GCS bucket access
 * This test uses the real bucket vertex-ai-hnaidu-contest-demo to verify
 * end-to-end functionality works with actual Google Cloud Storage.
 * 
 * Run this after setting up your .env file and authentication.
 */

import 'dotenv/config';
import { getFile, saveFile } from '../gcs/gcs-utils.js';
import { fileURLToPath } from 'url';
import path from 'path';

console.log('🌐 Live GCS Test - Starting...');

const BUCKET_NAME = 'vertex-ai-hnaidu-contest-demo';
const TEST_FILE_NAME = 'live-test-customer-data.json';

// Customer data from the implementation plan
const testCustomerData = {
  "userId": "user-12345",
  "customerName": "Harshal Naidu", 
  "accountNumber": "9876-54321",
  "billingAddress": "123 Main St, Charlotte, NC 28202",
  "autopay": {
    "isEnrolled": false,
    "paymentMethod": null
  },
  "accountStatus": {
    "isEligibleForPaymentPlan": true
  },
  "currentBill": {
    "billDate": "2025-07-12",
    "dueDate": "2025-08-05", 
    "totalAmountDue": "450.75"
  },
  "paymentHistory": [
    {
      "transactionId": "t_98765",
      "date": "2025-06-15",
      "amount": "148.21",
      "status": "Paid",
      "method": "Visa **** 4242",
      "declineDetails": null
    },
    {
      "transactionId": "t_12345", 
      "date": "2025-07-15",
      "amount": "151.04",
      "status": "Declined",
      "method": "Amex **** 1001",
      "declineDetails": {
        "reasonCode": "CALL_VOICE_CENTER",
        "reasonDescription": "Card issuer requires voice authorization."
      }
    }
  ],
  "disputes": []
};

async function runLiveGcsTest() {
  console.log('🌐 Live GCS Test - Actual Bucket Access');
  console.log('======================================\n');

  console.log('🔧 Environment Check:');
  console.log(`   PROJECT_ID: ${process.env.PROJECT_ID}`);
  console.log(`   GCS_BUCKET_NAME: ${process.env.GCS_BUCKET_NAME}`);
  console.log('');
  
  console.log(`📦 Using bucket: ${BUCKET_NAME}`);
  console.log(`📄 Test file: ${TEST_FILE_NAME}`);
  console.log('');

  let testsPassed = 0;
  let testsTotal = 0;

  // Helper function
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

  // Test 1: Save customer data to live bucket
  await runTest('Save customer data to live GCS bucket', async () => {
    const dataString = JSON.stringify(testCustomerData, null, 2);
    await saveFile(BUCKET_NAME, TEST_FILE_NAME, dataString);
    console.log(`   Successfully saved ${dataString.length} characters to GCS`);
  });

  // Test 2: Retrieve customer data from live bucket  
  await runTest('Retrieve customer data from live GCS bucket', async () => {
    const retrievedData = await getFile(BUCKET_NAME, TEST_FILE_NAME);
    const parsedData = JSON.parse(retrievedData);
    
    if (parsedData.userId !== testCustomerData.userId) {
      throw new Error('Retrieved data does not match saved data');
    }
    
    console.log(`   Successfully retrieved customer: ${parsedData.customerName}`);
    console.log(`   Account: ${parsedData.accountNumber}`);
    console.log(`   Payment history entries: ${parsedData.paymentHistory.length}`);
    
    // Check for declined payment
    const declinedPayment = parsedData.paymentHistory.find(p => p.status === 'Declined');
    if (declinedPayment) {
      console.log(`   ⚠️  Found declined payment: ${declinedPayment.transactionId} (${declinedPayment.declineDetails.reasonCode})`);
    }
  });

  // Test 3: Clean up - delete test file
  await runTest('Clean up test file', async () => {
    try {
      // Note: The current GCS utils don't have a delete function, so we'll try to overwrite with empty
      await saveFile(BUCKET_NAME, TEST_FILE_NAME, '{"deleted": true, "timestamp": "' + new Date().toISOString() + '"}');
      console.log('   Test file marked for cleanup');
    } catch (error) {
      console.log('   Cleanup not critical - test file remains in bucket');
    }
  });

  // Test 4: Try to read non-existent file (error handling)
  await runTest('Error handling - non-existent file', async () => {
    try {
      await getFile(BUCKET_NAME, 'non-existent-file-' + Date.now() + '.json');
      throw new Error('Should have thrown an error for non-existent file');
    } catch (error) {
      if (error.message.includes('not found')) {
        console.log('   Correctly threw "not found" error');
      } else {
        throw error;
      }
    }
  });

  // Summary
  console.log('📊 Live GCS Test Summary:');
  console.log(`   Tests passed: ${testsPassed}/${testsTotal}`);
  
  if (testsPassed === testsTotal) {
    console.log('\n🎉 ALL LIVE GCS TESTS PASSED!');
    console.log('✅ Your GCS configuration is working correctly');
    console.log('✅ You can read and write to the vertex-ai-hnaidu-contest-demo bucket'); 
    console.log('✅ Authentication is properly configured');
    console.log('\n🚀 Ready to proceed with Phase 2 implementation!');
    return true;
  } else {
    console.log('\n❌ Some live tests failed');
    console.log('\n🔧 Troubleshooting steps:');
    console.log('1. Make sure you have run: gcloud auth application-default login');
    console.log('2. Verify bucket exists: gcloud --project vertex-ai-studio-464114 storage ls gs://vertex-ai-hnaidu-contest-demo/');
    console.log('3. Check your .env file has the correct PROJECT_ID and GCS_BUCKET_NAME');
    console.log('4. Ensure you have proper permissions to read/write to the bucket');
    return false;
  }
}

// Run the test if this file is executed directly
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

if (isMainModule) {
  console.log('🚀 Starting Live GCS Test Runner...');
  runLiveGcsTest()
    .then(success => {
      console.log(`\n🏁 Test runner finished with success: ${success}`);
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test runner failed:', error.message);
      console.error('Stack:', error.stack);
      process.exit(1);
    });
} else {
  console.log('🔄 Module imported, not executing directly');
}

export { runLiveGcsTest }; 