
'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';

export async function deleteAuthUser(uid: string) {
    try {
        const adminApp = await getFirebaseAdmin();
        if (!adminApp) {
            throw new Error("Firebase Admin initialization failed.");
        }

        const authAdmin = adminApp.auth();
        await authAdmin.deleteUser(uid);

        return { success: true, message: "User deleted from Firebase Auth successfully." };

    } catch (error: any) {
        console.error('CRITICAL ERROR in deleteAuthUser:', error);
        
        let detailedMessage = 'An internal server error occurred.';
        if (error.code) {
             switch (error.code) {
                case 'auth/user-not-found':
                    detailedMessage = 'User not found in Firebase Authentication. They may have already been deleted.';
                    break;
                default:
                    detailedMessage = `Firebase Error: ${error.code} - ${error.message}`;
            }
        } else if (error.message) {
            detailedMessage = error.message;
        }

        return { success: false, message: detailedMessage };
    }
}
