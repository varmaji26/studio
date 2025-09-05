
'use server';

import { getFirebaseAdmin } from "@/lib/firebase-admin";
import { FieldValue } from 'firebase-admin/firestore';
import { getFirestore } from "firebase-admin/firestore";
import { getMessaging } from "firebase-admin/messaging";

interface SendNotificationPayload {
    title: string;
    message: string;
}

export async function sendPushNotifications(payload: SendNotificationPayload) {
    try {
        const adminApp = getFirebaseAdmin();
        const dbAdmin = getFirestore(adminApp);
        const messagingAdmin = getMessaging(adminApp);

        const usersSnapshot = await dbAdmin.collection('users').get();
        const tokens: string[] = [];
        
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
                tokens.push(...data.fcmTokens);
            }
        });

        const uniqueTokens = [...new Set(tokens)];

        await dbAdmin.collection('notifications').add({
            ...payload,
            createdAt: FieldValue.serverTimestamp(),
        });

        if (uniqueTokens.length === 0) {
            console.log("No device tokens found to send notifications.");
            return { success: true, message: "Notification logged, but no devices to send to." };
        }

        const message = {
            notification: {
                title: payload.title,
                body: payload.message,
            },
            webpush: {
                notification: {
                    icon: '/icon-192x192.png',
                },
            },
            tokens: uniqueTokens,
        };

        const response = await messagingAdmin.sendEachForMulticast(message);
        
        console.log(`${response.successCount} messages were sent successfully`);

        if (response.failureCount > 0) {
            const failedTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(uniqueTokens[idx]);
                    console.error(`Failed to send to token: ${uniqueTokens[idx]}`, resp.error);
                }
            });
            console.log('List of tokens that caused failures: ' + failedTokens);
             return { success: false, message: `Sent to ${response.successCount} devices, but failed for ${response.failureCount}. Check server logs for details.` };
        }

        return { success: true, message: `Notification sent to ${response.successCount} devices.` };

    } catch (error: any) {
        console.error('Error sending push notifications:', error);
        // Provide a more user-friendly and detailed error message
        const errorMessage = error.errorInfo ? `${error.errorInfo.code}: ${error.errorInfo.message}` : error.message || 'An unknown error occurred.';
        return { success: false, message: `An internal error occurred: ${errorMessage}` };
    }
}
