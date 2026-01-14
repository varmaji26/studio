
'use server';

import { collection, getDocs, query, where, Timestamp, writeBatch, collectionGroup } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export async function cleanAllUserData(days: number) {
    if (typeof days !== 'number' || days <= 0) {
        return { success: false, message: "Invalid number of days provided.", deletedBidsCount: 0, deletedDepositsCount: 0, deletedWithdrawalsCount: 0 };
    }

    try {
        const now = new Date();
        const cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - days);
        const cutoffTimestamp = Timestamp.fromDate(cutoffDate);

        let deletedBidsCount = 0;
        let deletedDepositsCount = 0;
        let deletedWithdrawalsCount = 0;

        const collectionsToClean: ('bids' | 'deposits' | 'withdrawals')[] = ['bids', 'deposits', 'withdrawals'];

        for (const collectionName of collectionsToClean) {
            const oldRecordsQuery = query(
                collectionGroup(db, collectionName),
                where('createdAt', '<', cutoffTimestamp)
            );

            const querySnapshot = await getDocs(oldRecordsQuery);
            let count = 0;

            if (!querySnapshot.empty) {
                const batchArray: any[] = [];
                batchArray.push(writeBatch(db));
                let operationCounter = 0;
                let batchIndex = 0;

                querySnapshot.forEach(doc => {
                    batchArray[batchIndex].delete(doc.ref);
                    operationCounter++;
                    if (operationCounter === 500) {
                        batchArray.push(writeBatch(db));
                        batchIndex++;
                        operationCounter = 0;
                    }
                });
                
                await Promise.all(batchArray.map(batch => batch.commit()));
                count = querySnapshot.size;
            }
            
            if (collectionName === 'bids') deletedBidsCount = count;
            if (collectionName === 'deposits') deletedDepositsCount = count;
            if (collectionName === 'withdrawals') deletedWithdrawalsCount = count;
        }

        return { success: true, message: "Old user data cleaned successfully.", deletedBidsCount, deletedDepositsCount, deletedWithdrawalsCount };

    } catch (error: any) {
        console.error("CRITICAL ERROR in cleanAllUserData:", error);
        
        let errorMessage = error.message || "An internal server error occurred while cleaning data.";
        if (error.code === 'failed-precondition' && error.message.includes('requires an index')) {
            errorMessage = "A required database index is missing. Please deploy the included firestore.indexes.json file by running 'firebase deploy --only firestore:indexes'. The index may take a few minutes to build.";
        }

        return { success: false, message: errorMessage, deletedBidsCount: 0, deletedDepositsCount: 0, deletedWithdrawalsCount: 0 };
    }
}
