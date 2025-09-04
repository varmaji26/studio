
'use server';

import { getMessaging } from "firebase-admin/messaging";
import { app, dbAdmin } from "@/lib/firebase-admin";

interface SendNotificationPayload {
    title: string;
    message: string;
}

export async function sendPushNotifications(payload: SendNotificationPayload) {
    try {
        const usersSnapshot = await dbAdmin.collection('users').get();
        const tokens: string[] = [];
        
        usersSnapshot.forEach(doc => {
            const data = doc.data();
            if (data.fcmTokens && Array.isArray(data.fcmTokens)) {
                tokens.push(...data.fcmTokens);
            }
        });

        const uniqueTokens = [...new Set(tokens)];

        // Log the notification to history regardless of whether tokens are present
        await dbAdmin.collection('notifications').add({
            ...payload,
            createdAt: new Date(),
        });

        if (uniqueTokens.length === 0) {
            console.log("No device tokens found to send notifications.");
            return { success: true, message: "Notification logged, but no devices to send to." };
        }

        const message = {
            notification: {
                title: payload.title,
                body: payload.message,
                icon: '/icon-192x192.png',
            },
            tokens: uniqueTokens,
            webpush: {
                notification: {
                    icon: '/icon-192x192.png',
                },
            },
        };

        const messaging = getMessaging(app);
        const response = await messaging.sendEachForMulticast(message);
        
        console.log(`${response.successCount} messages were sent successfully`);

        if (response.failureCount > 0) {
            const failedTokens: string[] = [];
            response.responses.forEach((resp, idx) => {
                if (!resp.success) {
                    failedTokens.push(uniqueTokens[idx]);
                }
            });
            console.log('List of tokens that caused failures: ' + failedTokens);
             return { success: false, message: `Sent to ${response.successCount} devices, but failed for ${response.failureCount}.` };
        }

        return { success: true, message: `Notification sent to ${response.successCount} devices.` };

    } catch (error) {
        console.error('Error sending push notifications:', error);
        return { success: false, message: 'An internal error occurred.' };
    }
}
