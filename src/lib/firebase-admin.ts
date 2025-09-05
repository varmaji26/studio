
import * as admin from 'firebase-admin';

// This function ensures that Firebase Admin is initialized only once.
function initializeFirebaseAdmin() {
  // If the app is already initialized, return the existing instance.
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // When deployed to a Google Cloud environment (like Firebase App Hosting),
  // the SDK automatically discovers the service account credentials.
  // This is the recommended and most secure way to initialize.
  try {
    console.log("Initializing Firebase Admin SDK with Application Default Credentials...");
    return admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  } catch (error: any) {
    console.error("Firebase Admin SDK initialization failed:", error);
    // This will cause server-side Firebase operations to fail,
    // which is expected if the environment is not configured correctly.
    // Do not throw an error here to allow the app to build, but log it critically.
    return null;
  }
}

// Export a single function to get the initialized app instance.
// It might return null if initialization fails.
export function getFirebaseAdmin() {
    return initializeFirebaseAdmin();
}
