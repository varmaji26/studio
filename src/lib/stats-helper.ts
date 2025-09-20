
'use client';

import { db } from './firebase';
import { collection, getDocs, doc, getDoc, setDoc, writeBatch, updateDoc } from 'firebase/firestore';

export async function setInitialStats() {
    const statsDocRef = doc(db, 'app-stats', 'dashboard');
    const usersCollectionRef = collection(db, 'users');

    try {
        const [statsDoc, usersSnapshot] = await Promise.all([
            getDoc(statsDocRef),
            getDocs(usersCollectionRef)
        ]);

        const actualUserCount = usersSnapshot.size;

        if (!statsDoc.exists()) {
            console.log("Stats document not found. Initializing application statistics...");
            const gamesSnapshot = await getDocs(collection(db, 'games'));
            const totalGames = gamesSnapshot.size;

            let totalBalance = 0;
            usersSnapshot.forEach(userDoc => {
                totalBalance += userDoc.data().balance || 0;
            });
            
            const initialStats = {
                totalUsers: actualUserCount,
                totalGames,
                totalBalance
            };

            await setDoc(statsDocRef, initialStats);
            console.log("Successfully initialized application statistics:", initialStats);

        } else {
            const currentStats = statsDoc.data();
            if (currentStats.totalUsers !== actualUserCount) {
                console.log(`User count mismatch detected. Synced: ${currentStats.totalUsers} -> Actual: ${actualUserCount}. Correcting...`);
                await updateDoc(statsDocRef, { totalUsers: actualUserCount });
            }
        }

    } catch (error) {
        console.error("Error ensuring initial stats are set and synced:", error);
    }
}
