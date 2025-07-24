/**
 * @file gcs-utils.js
 * @description Google Cloud Storage utility functions for reading and writing files
 * 
 * This module provides two asynchronous functions:
 * - getFile(bucketName, fileName): Downloads a file from GCS and returns its contents as a string
 * - saveFile(bucketName, fileName, data): Uploads data to GCS, overwriting if it exists
 */

import { Storage } from '@google-cloud/storage';

/**
 * Custom error class for when a file is not found in GCS.
 * This allows for more specific error handling than matching strings.
 */
export class GCSFileNotFoundError extends Error {
  constructor(message) {
    super(message);
    this.name = 'GCSFileNotFoundError';
  }
}

/**
 * Initialize Google Cloud Storage client
 * Uses the same authentication approach as the Gemini API client
 */
function createStorageClient() {
  // The @google-cloud/storage library, like other Google Cloud client libraries,
  // automatically uses Application Default Credentials (ADC). It will look for
  // credentials in the environment (e.g., GOOGLE_APPLICATION_CREDENTIALS_JSON
  // or a local gcloud login) without needing any explicit configuration here.
  // This makes the code cleaner and more portable across different environments.
  return new Storage();
}

/**
 * Downloads the specified file from Google Cloud Storage and returns its contents as a string
 * 
 * @param {string} bucketName - The name of the GCS bucket
 * @param {string} fileName - The name of the file to download
 * @returns {Promise<string>} The file contents as a string
 * @throws {Error} If the file doesn't exist or there's an error downloading
 */
export async function getFile(bucketName, fileName) {
  if (!bucketName || typeof bucketName !== 'string') {
    throw new Error('bucketName must be a non-empty string');
  }
  if (!fileName || typeof fileName !== 'string') {
    throw new Error('fileName must be a non-empty string');
  }

  const storage = createStorageClient();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);

  try {
    // Check if file exists first
    const [exists] = await file.exists();
    if (!exists) {
      throw new GCSFileNotFoundError(`File '${fileName}' not found in bucket '${bucketName}'`);
    }

    // Download the file
    const [fileBuffer] = await file.download();
    return fileBuffer.toString('utf8');
  } catch (error) {
    if (error instanceof GCSFileNotFoundError) {
      throw error; // Re-throw the specific error to be caught by the server.
    }
    throw new Error(`Failed to download file '${fileName}' from bucket '${bucketName}': ${error.message}`);
  }
}

/**
 * Uploads the provided data to Google Cloud Storage, overwriting the file if it exists
 * 
 * @param {string} bucketName - The name of the GCS bucket
 * @param {string} fileName - The name of the file to upload
 * @param {string} data - The data to upload (should be a string)
 * @returns {Promise<void>}
 * @throws {Error} If there's an error uploading the file
 */
export async function saveFile(bucketName, fileName, data) {
  if (!bucketName || typeof bucketName !== 'string') {
    throw new Error('bucketName must be a non-empty string');
  }
  if (!fileName || typeof fileName !== 'string') {
    throw new Error('fileName must be a non-empty string');
  }
  if (typeof data !== 'string') {
    throw new Error('data must be a string');
  }

  const storage = createStorageClient();
  const bucket = storage.bucket(bucketName);
  const file = bucket.file(fileName);

  try {
    // Upload the data, overwriting if the file exists
    await file.save(data, {
      metadata: {
        contentType: 'application/json', // Assuming JSON data for customer files
      },
    });
  } catch (error) {
    throw new Error(`Failed to upload file '${fileName}' to bucket '${bucketName}': ${error.message}`);
  }
} 