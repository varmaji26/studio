
import * as admin from 'firebase-admin';
import serviceAccount from './firebase-service-account.json';

// This function ensures that Firebase Admin is initialized only once.
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  try {
    // A more robust way to initialize, especially for environments that might alter JSON formatting.
    const serviceAccountCredentials = {
      projectId: serviceAccount.project_id,
      clientEmail: serviceAccount.client_email,
      // The private key must have newline characters correctly formatted.
      privateKey: serviceAccount.private_key.replace(/\\n/g, '\n'),
    } as admin.ServiceAccount;

    const app = admin.initializeApp({
      credential: admin.credential.cert(serviceAccountCredentials),
    });
    console.log("Firebase Admin SDK initialized successfully.");
    return app;
  } catch (error: any) {
    console.error("Error initializing Firebase Admin SDK:", error);
    // Re-throw a more informative error to be caught by the caller
    throw new Error(`Could not initialize Firebase Admin SDK: ${error.message}`);
  }
}

// Export a single function to get the initialized app instance.
export function getFirebaseAdmin() {
    return initializeFirebaseAdmin();
}
