
import * as admin from 'firebase-admin';
import serviceAccount from './firebase-service-account.json';

if (!admin.apps.length) {
  admin.initializeApp({
    credential: admin.credential.cert(serviceAccount as admin.ServiceAccount),
  });
}

const app = admin.apps[0]!;
const authAdmin = admin.auth(app);
const dbAdmin = admin.firestore(app);
const messagingAdmin = admin.messaging(app);

export { app, authAdmin, dbAdmin, messagingAdmin };
