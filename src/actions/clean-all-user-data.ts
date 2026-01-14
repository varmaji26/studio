
'use server';

import { collectionGroup, getDocs, query, where, Timestamp, writeBatch } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function cleanAllUserData(days: number) {
    if (typeof days !== 'number' || days <= 0) {
        return { success: false, message: "Invalid number of days provided.", deletedBidsCount: 0, deletedDepositsCount: 0, deletedWithdrawalsCount: 0 };
    }

    try {
        const now = new Date();
        const cutoffDate = new Date(now.setDate(now.getDate() - days));
        const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

        let deletedBidsCount = 0;
        let deletedDepositsCount = 0;
        let deletedWithdrawalsCount = 0;

        const collectionsToClean = ['bids', 'deposits', 'withdrawals'];

        for (const collectionName of collectionsToClean) {
            const oldRecordsQuery = query(
                collectionGroup(db, collectionName),
                where('createdAt', '<', cutoffTimestamp)
            );

            const querySnapshot = await getDocs(oldRecordsQuery);
            let count = 0;

            if (querySnapshot.empty) {
                continue;
            }

            // Firestore allows a maximum of 500 operations in a single batch.
            const batches = [];
            let currentBatch = writeBatch(db);
            let operationsInCurrentBatch = 0;

            querySnapshot.forEach((doc) => {
                currentBatch.delete(doc.ref);
                operationsInCurrentBatch++;
                count++;

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
            
            if (collectionName === 'bids') deletedBidsCount = count;
            if (collectionName === 'deposits') deletedDepositsCount = count;
            if (collectionName === 'withdrawals') deletedWithdrawalsCount = count;
        }

        return { success: true, message: "Old user data cleaned successfully.", deletedBidsCount, deletedDepositsCount, deletedWithdrawalsCount };

    } catch (error: any) {
        console.error("CRITICAL ERROR in cleanAllUserData:", error);
        return { success: false, message: error.message || "An internal server error occurred while cleaning data.", deletedBidsCount: 0, deletedDepositsCount: 0, deletedWithdrawalsCount: 0 };
    }
}
