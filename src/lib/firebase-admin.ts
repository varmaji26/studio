
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
    console.error("Error initializing Firebase Admin SDK. Ensure you are in a Google Cloud environment or have GOOGLE_APPLICATION_CREDENTIALS set.", error);
    throw new Error(`Could not initialize Firebase Admin SDK.`);
  }
}

// Export a single function to get the initialized app instance.
export function getFirebaseAdmin() {
    return initializeFirebaseAdmin();
}
