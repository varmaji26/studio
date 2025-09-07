
'use server';

import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import serviceAccount from '@/../serviceAccountKey.json';

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
    return null;
  }
}

interface SendNotificationPayload {
    title: string;
    message: string;
}

export async function sendPushNotifications(payload: SendNotificationPayload) {
    try {
        const adminApp = initializeFirebaseAdmin();
        if (!adminApp) {
            throw new Error("Firebase Admin initialization failed. Check server logs.");
        }
        
        const dbAdmin = admin.firestore(adminApp);
        const messagingAdmin = admin.messaging(adminApp);

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
        // Enhanced Error Logging
        console.error('CRITICAL ERROR in sendPushNotifications:', error);
        console.error('Error Code:', error.code);
        console.error('Error Message:', error.message);
        console.error('Full Error Object:', JSON.stringify(error, null, 2));

        let detailedMessage = 'An internal error occurred.';
        if (error.errorInfo) {
            detailedMessage = `Firebase Error: ${error.errorInfo.code} - ${error.errorInfo.message}`;
        } else if (error.code) {
             detailedMessage = `Error Code: ${error.code}. Please check server logs for the full error details.`;
        } else if (error.message) {
            detailedMessage = error.message;
        }

        return { success: false, message: detailedMessage };
    }
}
