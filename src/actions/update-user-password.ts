'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';

interface UpdatePasswordPayload {
    uid: string;
    newPassword: string;
}

/**
 * यूजर का पासवर्ड अपडेट करने के लिए सर्वर एक्शन।
 * यह Firebase Admin SDK का उपयोग करता है जिससे पुराना पासवर्ड जानने की जरूरत नहीं होती।
 */
export async function updateUserPassword(payload: UpdatePasswordPayload) {
    try {
        const adminApp = await getFirebaseAdmin();
        if (!adminApp) {
            throw new Error("Firebase Admin को इनिशियलाइज़ नहीं किया जा सका।");
        }

        const authAdmin = adminApp.auth();
        
        // Firebase Auth में पासवर्ड अपडेट करें
        await authAdmin.updateUser(payload.uid, {
            password: payload.newPassword,
        });

        console.log(`Password successfully updated for UID: ${payload.uid}`);

        return { 
            success: true, 
            message: "पासवर्ड सफलतापूर्वक अपडेट कर दिया गया है।" 
        };

    } catch (error: any) {
        console.error('ERROR in updateUserPassword:', error);
        
        let detailedMessage = 'सर्वर में कुछ समस्या आई है।';
        if (error.code === 'auth/user-not-found') {
            detailedMessage = 'यूजर नहीं मिला।';
        } else if (error.code === 'auth/invalid-password') {
            detailedMessage = 'नया पासवर्ड कम से कम 6 अक्षरों का होना चाहिए।';
        }

        return { 
            success: false, 
            message: detailedMessage 
        };
    }
}
