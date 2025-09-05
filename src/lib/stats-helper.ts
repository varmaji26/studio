
'use client';

import { db } from './firebase';
import { collection, getDocs, doc, getDoc, setDoc, writeBatch } from 'firebase/firestore';

// This helper function calculates initial stats and sets them in Firestore.
// It should be run once, or whenever you need to recalculate stats from scratch.
export async function setInitialStats() {
    const statsDocRef = doc(db, 'app-stats', 'dashboard');
    const statsDoc = await getDoc(statsDocRef);

    // Only run if the stats document doesn't exist
    if (statsDoc.exists()) {
        return;
    }

    console.log("Initializing application statistics...");

    const usersCollection = collection(db, 'users');
    const gamesCollection = collection(db, 'games');

    const usersSnapshot = await getDocs(usersCollection);
    const gamesSnapshot = await getDocs(gamesCollection);

    const totalUsers = usersSnapshot.size;
    const totalGames = gamesSnapshot.size;

    let totalBalance = 0;
    usersSnapshot.forEach(userDoc => {
        totalBalance += userDoc.data().balance || 0;
    });
    
    const initialStats = {
        totalUsers,
        totalGames,
        totalBalance
    };

    try {
        await setDoc(statsDocRef, initialStats);
        console.log("Successfully initialized application statistics:", initialStats);
    } catch (error) {
        console.error("Error setting initial stats:", error);
    }
}
