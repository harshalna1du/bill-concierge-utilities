/**
 * @file test-all-gcs.js
 * @description Main test runner for all GCS-related functionality
 * Runs both unit tests and integration tests for the GCS implementation
 */

import 'dotenv/config';
import { runTests as runUtilsTests } from './test-gcs-utils.js';
import { runEndpointTests as runEndpointTests } from './test-gcs-endpoints.js';

async function runAllGcsTests() {
  console.log('🚀 Running All GCS Tests...\n');
  console.log('=' .repeat(60));
  
  const startTime = Date.now();
  let allTestsPassed = true;

  // Run unit tests for GCS utilities
  console.log('\n📦 Phase 1: GCS Utilities Unit Tests');
  console.log('-' .repeat(40));
  try {
    const utilsTestsPassed = await runUtilsTests();
    if (!utilsTestsPassed) {
      allTestsPassed = false;
      console.log('⚠️  Some utility unit tests failed');
    }
  } catch (error) {
    console.error('❌ Utility tests crashed:', error.message);
    allTestsPassed = false;
  }

  // Run integration tests for API endpoints
  console.log('\n🌐 Phase 2: API Endpoint Integration Tests');
  console.log('-' .repeat(40));
  try {
    const endpointTestsPassed = await runEndpointTests();
    if (!endpointTestsPassed) {
      allTestsPassed = false;
      console.log('⚠️  Some endpoint integration tests failed');
    }
  } catch (error) {
    console.error('❌ Endpoint tests crashed:', error.message);
    allTestsPassed = false;
  }

  // Final summary
  const endTime = Date.now();
  const duration = ((endTime - startTime) / 1000).toFixed(2);
  
  console.log('\n' + '=' .repeat(60));
  console.log('📊 FINAL TEST SUMMARY');
  console.log('=' .repeat(60));
  console.log(`⏱️  Total execution time: ${duration} seconds`);
  
  if (allTestsPassed) {
    console.log('🎉 ALL GCS TESTS PASSED!');
    console.log('');
    console.log('✅ GCS utilities are working correctly');
    console.log('✅ API endpoints are responding properly');
    console.log('✅ Error handling is functioning as expected');
    console.log('');
    console.log('🔧 Next steps:');
    console.log('   1. Install dependencies: npm install');
    console.log('   2. Configure GCS_BUCKET_NAME in your .env file');
    console.log('   3. Test with actual GCS bucket if needed');
    console.log('   4. Proceed to Phase 2 (bill-concierge-agent)');
    
    return true;
  } else {
    console.log('❌ SOME TESTS FAILED');
    console.log('');
    console.log('🔍 Review the detailed output above to identify issues');
    console.log('💡 Note: Some failures may be expected if GCS is not configured');
    console.log('');
    console.log('🛠️  Troubleshooting:');
    console.log('   - Ensure the server is running with npm run dev');
    console.log('   - Check your .env file configuration');
    console.log('   - Verify Google Cloud credentials are set up');
    
    return false;
  }
}

// Configuration check and helpful info
function printEnvironmentInfo() {
  console.log('🔧 Environment Configuration:');
  console.log(`   PROJECT_ID: ${process.env.PROJECT_ID || 'vertex-ai-studio-464114 (expected)'}`);
  console.log(`   GCS_BUCKET_NAME: ${process.env.GCS_BUCKET_NAME || 'vertex-ai-hnaidu-contest-demo (expected)'}`);
  console.log(`   Has Google credentials: ${!!process.env.GOOGLE_APPLICATION_CREDENTIALS_JSON}`);
  console.log('');
}

import { fileURLToPath } from 'url';
const __filename = fileURLToPath(import.meta.url);
const isMainModule = process.argv[1] === __filename;

// Run the tests if this file is executed directly
if (isMainModule) {
  console.log('🧪 GCS Test Suite for harshal-utilities');
  console.log('Testing Phase 1 implementation from the architecture plan\n');
  
  printEnvironmentInfo();
  
  runAllGcsTests()
    .then(success => {
      process.exit(success ? 0 : 1);
    })
    .catch(error => {
      console.error('❌ Test suite failed to run:', error);
      process.exit(1);
    });
}

export { runAllGcsTests }; 