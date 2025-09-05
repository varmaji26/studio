
import * as admin from 'firebase-admin';

// This function ensures that Firebase Admin is initialized only once.
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  const serviceAccountString = process.env.FIREBASE_SERVICE_ACCOUNT;

  if (serviceAccountString) {
    try {
      console.log("Initializing Firebase Admin SDK with service account from environment variable...");
      const serviceAccount = JSON.parse(serviceAccountString);
      return admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
      });
    } catch (e: any) {
      console.error("Failed to parse FIREBASE_SERVICE_ACCOUNT. Make sure it's a valid JSON string.", e.message);
      throw new Error("Could not initialize Firebase Admin SDK with service account from environment variable.");
    }
  }

  // When deployed to a Google Cloud environment, the SDK can automatically
  // discover the service account credentials.
  try {
    console.log("Initializing Firebase Admin SDK with Application Default Credentials...");
    return admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  } catch (error: any) {
    console.error("Application Default Credentials failed. Ensure you are in a Google Cloud environment or have GOOGLE_APPLICATION_CREDENTIALS set.", error.message);
    throw new Error(`Could not initialize Firebase Admin SDK.`);
  }
}

// Export a single function to get the initialized app instance.
export function getFirebaseAdmin() {
    return initializeFirebaseAdmin();
}
