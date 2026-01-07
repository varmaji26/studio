'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';

export async function cleanOldBids() {
    try {
        const adminApp = await getFirebaseAdmin();
        if (!adminApp) {
            throw new Error("Firebase Admin initialization failed. Check server logs for details.");
        }
        
        const db = adminApp.firestore();
        const bidsCollection = db.collection('bids');

        // Calculate the date 30 days ago
        const thirtyDaysAgo = new Date();
        thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
        
        // Firestore timestamp for comparison
        const threshold = FieldValue.serverTimestamp();

        const oldBidsQuery = bidsCollection.where('createdAt', '<', thirtyDaysAgo);
        
        let totalDeleted = 0;
        const BATCH_SIZE = 400; // Firestore write batch limit is 500, use a smaller size for safety

        // Process deletions in batches until no old documents are left
        while (true) {
            const snapshot = await oldBidsQuery.limit(BATCH_SIZE).get();
            if (snapshot.empty) {
                // No more documents to delete
                break;
            }

            const batch = db.batch();
            snapshot.docs.forEach(doc => {
                batch.delete(doc.ref);
            });

            await batch.commit();
            totalDeleted += snapshot.size;

            // Small delay to prevent hitting rate limits, although usually not necessary for this operation
            await new Promise(resolve => setTimeout(resolve, 100));
        }

        if (totalDeleted === 0) {
            return { success: true, message: 'No old bids to clean. Everything is up-to-date.' };
        }

        return { success: true, message: `Successfully deleted ${totalDeleted} bids older than 30 days.` };

    } catch (error: any) {
        console.error('CRITICAL ERROR in cleanOldBids:', error);
        
        let detailedMessage = 'An internal server error occurred while cleaning old bids.';
        if (error.message) {
            detailedMessage = error.message;
        }

        return { success: false, message: detailedMessage };
    }
}
