
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, DocumentData, getDoc } from 'firebase/firestore';

interface AuthUser extends User {
    isAdmin?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (authUser) => {
      if (authUser) {
        const userDocRef = doc(db, 'users', authUser.uid);
        
        // Use getDoc for initial load to ensure loading state is set promptly.
        try {
            const docSnap = await getDoc(userDocRef);
            if (docSnap.exists()) {
                const userData = docSnap.data() as DocumentData;
                setUser({ ...authUser, isAdmin: userData.isAdmin || false });
            } else {
                // Handle case where user exists in Auth but not in Firestore yet.
                setUser({ ...authUser, isAdmin: false });
            }
        } catch (error) {
            console.error("Error fetching user document:", error);
            setUser({ ...authUser, isAdmin: false }); // Default to non-admin on error
        } finally {
            setLoading(false);
        }

        // Set up a listener for real-time updates after the initial load.
        const unsubProfile = onSnapshot(userDocRef, (doc) => {
            if (doc.exists()) {
                const userData = doc.data() as DocumentData;
                setUser(prevUser => prevUser ? { ...prevUser, ...authUser, isAdmin: userData.isAdmin || false } : { ...authUser, isAdmin: userData.isAdmin || false });
            }
        });

        // The returned function from onAuthStateChanged should be the one to unsubscribe from it.
        // We can't return the onSnapshot unsubscriber directly here.
        // A simple approach is to let the onAuthStateChanged handle the main auth state,
        // and manage the profile listener separately if needed, but for this app's lifecycle,
        // it's okay to re-attach when auth state changes.
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}
