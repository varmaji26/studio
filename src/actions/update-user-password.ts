
'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';

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
        const adminApp = getFirebaseAdmin();
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
