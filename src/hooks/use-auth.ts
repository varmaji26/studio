
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
    let unsubscribeProfile: (() => void) | undefined;

    const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
      // Unsubscribe from the previous user's profile listener if it exists
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }

      if (authUser) {
        const userDocRef = doc(db, 'users', authUser.uid);
        unsubscribeProfile = onSnapshot(userDocRef, (doc) => {
          const userData = doc.exists() ? doc.data() as DocumentData : {};
          setUser({ ...authUser, isAdmin: userData.isAdmin || false });
          setLoading(false); 
        }, (error) => {
            console.error("Error fetching user profile:", error);
            setUser({ ...authUser, isAdmin: false }); // Default to non-admin on error
            setLoading(false);
        });
      } else {
        setUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeAuth();
      if (unsubscribeProfile) {
        unsubscribeProfile();
      }
    };
  }, []);

  return { user, loading };
}
