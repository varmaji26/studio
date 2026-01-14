
'use server';

import { collection, getDocs, query, where, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function cleanOldWins(days: number) {
    if (typeof days !== 'number' || days <= 0) {
        return { success: false, message: "Invalid number of days provided.", deletedCount: 0 };
    }

    try {
        const now = new Date();
        const cutoffDate = new Date(now.setDate(now.getDate() - days));
        const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

        const oldWinsQuery = query(
            collection(db, 'bids'),
            where('status', '==', 'won'),
            where('createdAt', '<', cutoffTimestamp)
        );

        const querySnapshot = await getDocs(oldWinsQuery);

        if (querySnapshot.empty) {
            return { success: true, message: "No old winning bids to delete.", deletedCount: 0 };
        }

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

        if (operationsInCurrentBatch > 0) {
            batches.push(currentBatch);
        }

        await Promise.all(batches.map(batch => batch.commit()));

        return { success: true, message: `Successfully deleted ${querySnapshot.size} old winning bids.`, deletedCount: querySnapshot.size };

    } catch (error: any) {
        console.error("CRITICAL ERROR in cleanOldWins:", error);
        return { success: false, message: error.message || "An internal server error occurred.", deletedCount: 0 };
    }
}
