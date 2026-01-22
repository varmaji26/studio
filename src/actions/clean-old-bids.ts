'use server';

import { collection, getDocs, query, where, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function cleanOldBids(days: number) {
    if (typeof days !== 'number' || days <= 0) {
        return { success: false, message: "Invalid number of days provided.", deletedCount: 0 };
    }

    try {
        const now = new Date();
        const cutoffDate = new Date(now.setDate(now.getDate() - days));
        const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

        const oldBidsQuery = query(
            collection(db, 'bids'),
            where('createdAt', '<', cutoffTimestamp)
        );

        const querySnapshot = await getDocs(oldBidsQuery);

        if (querySnapshot.empty) {
            return { success: true, message: "No old bids to delete.", deletedCount: 0 };
        }

        // Firestore allows a maximum of 500 operations in a single batch.
        // We will process deletes in chunks of 500.
        const batches = [];
        let currentBatch = writeBatch(db);
        let operationsInCurrentBatch = 0;

        querySnapshot.forEach((doc) => {
            currentBatch.delete(doc.ref);
            operationsInCurrentBatch++;

            if (operationsInCurrentBatch === 500) {
                batches.push(currentBatch);
                currentBatch = writeBatch(db);
                operationsInCurrentBatch = 0;
            }
        });

        // Add the last batch if it has any operations
        if (operationsInCurrentBatch > 0) {
            batches.push(currentBatch);
        }

        // Commit all batches
        await Promise.all(batches.map(batch => batch.commit()));

        return { success: true, message: `Successfully deleted ${querySnapshot.size} old bids.`, deletedCount: querySnapshot.size };

    } catch (error: any) {
        console.error("CRITICAL ERROR in cleanOldBids:", error);
        return { success: false, message: error.message || "An internal server error occurred.", deletedCount: 0 };
    }
}
