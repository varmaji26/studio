
import * as admin from 'firebase-admin';
import serviceAccount from './firebase-service-account.json';

// This function ensures that Firebase Admin is initialized only once.
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  try {
    const serviceAccountCredentials = serviceAccount as admin.ServiceAccount;
    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountCredentials),
    });
    console.log("Firebase Admin SDK initialized successfully.");
    return app;
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK:", error);
    // Re-throw the error to be caught by the caller
    throw new Error("Could not initialize Firebase Admin SDK. Please check server logs.");
  }
}

// Export a single function to get the initialized app instance.
// This is a safer pattern for serverless environments.
export function getFirebaseAdmin() {
    return initializeFirebaseAdmin();
}
