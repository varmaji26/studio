
'use client';

import { useState, useEffect } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';

interface AuthUser extends User {
    isAdmin?: boolean;
}

export function useAuth() {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (authUser) => {
      if (authUser) {
        const userDocRef = doc(db, 'users', authUser.uid);
        const unsubProfile = onSnapshot(userDocRef, (doc) => {
          if (doc.exists()) {
            const userData = doc.data() as DocumentData;
            setUser({ ...authUser, isAdmin: userData.isAdmin || false });
          } else {
            // User exists in Auth, but not in Firestore yet.
            // This can happen during signup. We'll treat them as non-admin for now.
             setUser({ ...authUser, isAdmin: false });
          }
          setLoading(false);
        }, (error) => {
            console.error("Error fetching user profile:", error);
            setUser({ ...authUser, isAdmin: false }); // Default to non-admin on error
            setLoading(false);
        });
        
        // We could return unsubProfile here, but onAuthStateChanged's unsub handles it.
        // When auth state changes (e.g., logout), this whole block re-runs or clears.
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, []);

  return { user, loading };
}
