
'use server';

import * as admin from 'firebase-admin';

// Helper function to initialize Firebase Admin SDK safely.
function initializeFirebaseAdmin() {
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }
  try {
    // This will automatically use the service account credentials available in the App Hosting environment.
    return admin.initializeApp({
      credential: admin.credential.applicationDefault(),
    });
  } catch (error) {
    console.error('Firebase Admin SDK initialization failed:', error);
    // Return null or handle the error as appropriate for your application.
    // In a server action, this will likely cause the function to fail, which is expected.
    return null;
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
            throw new Error("Firebase Admin initialization failed. Check server logs.");
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
