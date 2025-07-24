/**
 * @file test-gcs-service-account.js
 * @description A standalone script to test Google Cloud Storage authentication and permissions.
 * 
 * This script performs a full read/write/delete cycle to a GCS bucket using
 * Application Default Credentials (ADC). It's designed to be run from the command
 * line to verify that a service account has the correct IAM permissions.
 * 
 * To run this script:
 * 1. Make sure you have a .env file with GCS_BUCKET_NAME and GOOGLE_APPLICATION_CREDENTIALS.
 * 2. Run the following command from the `harshal-utilities` directory:
 *    node test/test-gcs-service-account.js
 */

import 'dotenv/config';
import { Storage } from '@google-cloud/storage';

async function testGcsConnection() {
  console.log('--- Starting GCS Service Account Test ---');

  // 1. Check for required environment variables
  const bucketName = process.env.GCS_BUCKET_NAME;
  if (!bucketName) {
    console.error('❌ ERROR: GCS_BUCKET_NAME environment variable is not set in your .env file.');
    process.exit(1);
  }

  if (!process.env.GOOGLE_APPLICATION_CREDENTIALS) {
    console.error('❌ ERROR: GOOGLE_APPLICATION_CREDENTIALS environment variable is not set in your .env file.');
    console.error('   This should be the full path to your service account JSON key file.');
    process.exit(1);
  }

  console.log(`[INFO] Using bucket: ${bucketName}`);
  
  const storage = new Storage();
  const bucket = storage.bucket(bucketName);
  const testFileName = `service-account-test-${Date.now()}.txt`;
  const file = bucket.file(testFileName);
  const testContent = `This is a test file written at ${new Date().toISOString()}`;
  let fileWasCreated = false;

  try {
    // 2. Test WRITE permission
    console.log(`[STEP 1/3] Attempting to write file '${testFileName}'...`);
    await file.save(testContent);
    fileWasCreated = true;
    console.log('✅ SUCCESS: Write permission verified.');

    // 3. Test READ permission
    console.log(`[STEP 2/3] Attempting to read file '${testFileName}'...`);
    const [contents] = await file.download();
    if (contents.toString() !== testContent) {
      throw new Error('Read data does not match written data.');
    }
    console.log('✅ SUCCESS: Read permission verified.');

    // 4. Test DELETE permission (cleanup)
    console.log(`[STEP 3/3] Attempting to delete file '${testFileName}'...`);
    await file.delete();
    console.log('✅ SUCCESS: Delete permission verified.');

    console.log('\n--- GCS Service Account Test Passed Successfully! 🎉 ---');

  } catch (error) {
    console.error('\n❌ TEST FAILED: An error occurred during the test.');
    console.error('   This likely indicates an IAM permission issue with your service account.');
    console.error('   Ensure the service account has the "Storage Object Admin" role on the bucket.');
    console.error('\n--- Error Details ---');
    console.error(error);

    if (fileWasCreated) {
      console.log('\n--- Attempting cleanup of created file ---');
      await file.delete().catch(cleanupError => console.warn('⚠️  Cleanup failed:', cleanupError.message));
      console.log('✅ Cleanup attempted.');
    }
    process.exit(1);
  }
}

testGcsConnection();