
import * as admin from 'firebase-admin';

const serviceAccount = process.env.FIREBASE_SERVICE_ACCOUNT_KEY as string;

const decodedServiceAccount = JSON.parse(Buffer.from(serviceAccount, 'base64').toString('utf-8'));

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(decodedServiceAccount),
  });
}

export const app = admin.apps[0]!;
export const authAdmin = admin.auth();
export const dbAdmin = admin.firestore();
