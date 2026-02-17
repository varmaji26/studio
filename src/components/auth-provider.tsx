'use client';

import { useState, useEffect, createContext } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import { auth, db } from '@/lib/firebase';
import { doc, onSnapshot, DocumentData } from 'firebase/firestore';

export interface AuthUser extends User {
    isAdmin?: boolean;
}

export interface AuthContextType {
    user: AuthUser | null;
    loading: boolean;
}

export const AuthContext = createContext<AuthContextType>({
    user: null,
    loading: true,
});

export function AuthProvider({ children }: { children: React.ReactNode }) {
    const [user, setUser] = useState<AuthUser | null>(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        let unsubscribeProfile: (() => void) | undefined;

        const unsubscribeAuth = onAuthStateChanged(auth, (authUser) => {
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
                    setUser({ ...authUser, isAdmin: false });
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

    return (
        <AuthContext.Provider value={{ user, loading }}>
            {children}
        </AuthContext.Provider>
    );
}
