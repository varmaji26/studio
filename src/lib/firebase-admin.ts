
import * as admin from 'firebase-admin';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string;

let decodedServiceAccount: object;
try {
    decodedServiceAccount = JSON.parse(Buffer.from(serviceAccount, 'base64').toString('utf-8'));
} catch (error) {
    console.error("Failed to parse Firebase service account key. Ensure it's a valid base64 encoded JSON.", error);
    throw new Error("Invalid FIREBASE_SERVICE_ACCOUNT_KEY.");
}


if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(decodedServiceAccount),
  });
}

const app = admin.apps[0]!;
const authAdmin = admin.auth(app);
const dbAdmin = admin.firestore(app);
const messagingAdmin = admin.messaging(app);

export { app, authAdmin, dbAdmin, messagingAdmin };
