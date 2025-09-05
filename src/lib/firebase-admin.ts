
import * as admin from 'firebase-admin';

// This is a more robust way to handle JSON imports in various environments.
import serviceAccountJson from './firebase-service-account.json';
const serviceAccount = serviceAccountJson as admin.ServiceAccount;


// This function ensures that Firebase Admin is initialized only once.
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  try {
    const app = admin.initializeApp({
      credential: admin.credential.cert({
        projectId: serviceAccount.project_id,
        clientEmail: serviceAccount.client_email,
        // The private key from the JSON file is already in the correct format.
        privateKey: serviceAccount.private_key,
      }),
    });
    console.log("Firebase Admin SDK initialized successfully.");
    return app;
  } catch (error: any) {
    console.error("Error initializing Firebase Admin SDK:", error);
    // Throwing an error here can help debug issues during deployment.
    throw new Error(`Could not initialize Firebase Admin SDK: ${error.message}`);
  }
}

// Export a single function to get the initialized app instance.
// This ensures the initialization logic is run only when the admin features are needed.
export function getFirebaseAdmin() {
    return initializeFirebaseAdmin();
}
