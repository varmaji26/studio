
'use server';

import * as admin from 'firebase-admin';
import serviceAccountJson from '@/../serviceAccountKey.json';

// Type assertion for the service account key
const serviceAccount = serviceAccountJson as admin.ServiceAccount;


// Helper function to initialize Firebase Admin SDK safely.
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }
  try {
    return admin.initializeApp({
      credential: admin.credential.cert(serviceAccount),
    });
  } catch (error) {
    console.error('Firebase Admin SDK initialization failed:', error);
     // Propagate a more specific error to the client
    throw new Error('Server configuration error. Could not initialize Firebase Admin.');
  }
}

interface UpdatePasswordPayload {
    uid: string;
    newPassword: string;
}

export async function updateUserPassword(payload: UpdatePasswordPayload) {
    const { uid, newPassword } = payload;

    if (!uid || !newPassword || newPassword.length < 6) {
        return { success: false, message: 'Invalid input. UID and a password of at least 6 characters are required.' };
    }

    try {
        const adminApp = initializeFirebaseAdmin();
        if (!adminApp) {
             // This case should now be handled by the error thrown in initializeFirebaseAdmin
            throw new Error("Firebase Admin initialization failed.");
        }
        
        const authAdmin = admin.auth(adminApp);
        
        await authAdmin.updateUser(uid, {
            password: newPassword,
        });

        console.log(`Successfully updated password for user: ${uid}`);
        return { success: true, message: 'Password updated successfully.' };

    } catch (error: any) {
        console.error(`CRITICAL ERROR updating password for UID ${uid}:`, error);
        
        let detailedMessage = 'An internal error occurred while updating the password.';
        if (error.code === 'auth/user-not-found') {
            detailedMessage = 'This user does not exist in Firebase Authentication.';
        } else if (error.message) {
            detailedMessage = error.message;
        }

        return { success: false, message: detailedMessage };
    }
}
