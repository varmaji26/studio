
import * as admin from 'firebase-admin';

// This function ensures that Firebase Admin is initialized only once.
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // When deployed to a Google Cloud environment, the SDK can automatically
  // discover the service account credentials.
  try {
    const app = admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
    console.log("Firebase Admin SDK initialized successfully.");
    return app;
  } catch (error: any) {
    console.error("Error initializing Firebase Admin SDK with applicationDefault. Ensure you are in a Google Cloud environment or have GOOGLE_APPLICATION_CREDENTIALS set.", error);
    // As a fallback for local development without the env var, you might use a service account file,
    // but it should NOT be committed to git.
    // This fallback is commented out to encourage best practices.
    /*
    try {
        const serviceAccount = require('./firebase-service-account.json');
        const app = admin.initializeApp({
            credential: admin.credential.cert(serviceAccount)
        });
        console.log("Firebase Admin SDK initialized successfully from local file.");
        return app;
    } catch (fileError) {
        console.error("Could not initialize from file. Service account file may be missing or malformed.", fileError);
        throw new Error(`Could not initialize Firebase Admin SDK.`);
    }
    */
    throw new Error(`Could not initialize Firebase Admin SDK.`);
  }
}

// Export a single function to get the initialized app instance.
export function getFirebaseAdmin() {
    return initializeFirebaseAdmin();
}
