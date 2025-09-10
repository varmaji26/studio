
'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';

interface UpdatePasswordPayload {
    uid: string;
    newPassword: string;
}

export async function updateUserPassword(payload: UpdatePasswordPayload) {
    try {
        const adminApp = await getFirebaseAdmin();
        if (!adminApp) {
            throw new Error("Firebase Admin initialization failed.");
        }

        const authAdmin = adminApp.auth();
        await authAdmin.updateUser(payload.uid, {
            password: payload.newPassword,
        });

        return { success: true, message: "Password updated successfully." };

    } catch (error: any) {
        console.error('CRITICAL ERROR in updateUserPassword:', error);
        
        let detailedMessage = 'An internal server error occurred.';
        if (error.code) {
             switch (error.code) {
                case 'auth/user-not-found':
                    detailedMessage = 'User not found.';
                    break;
                case 'auth/invalid-password':
                    detailedMessage = 'Password must be at least 6 characters long.';
                    break;
                default:
                    detailedMessage = `Firebase Error: ${error.code}`;
            }
        } else if (error.message) {
            detailedMessage = error.message;
        }

        return { success: false, message: detailedMessage };
    }
}
