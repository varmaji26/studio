
import * as admin from 'firebase-admin';
import serviceAccount from './firebase-service-account.json';

// This check prevents re-initialization in scenarios like hot-reloading
if (!admin.apps.length) {
  try {
    // The type assertion is necessary because the JSON module is dynamically imported.
    const serviceAccountCredentials = serviceAccount as admin.ServiceAccount;

    admin.initializeApp({
      credential: admin.credential.cert(serviceAccountCredentials),
    });
    console.log("Firebase Admin SDK initialized successfully from JSON file.");
  } catch (error) {
    console.error("Error initializing Firebase Admin SDK from JSON file:", error);
  }
}

const app = admin.apps[0]!;
const authAdmin = admin.auth(app);
const dbAdmin = admin.firestore(app);
const messagingAdmin = admin.messaging(app);

export { app, authAdmin, dbAdmin, messagingAdmin };
