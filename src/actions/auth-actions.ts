
'use server';

import { getFirebaseAdmin } from '@/lib/firebase-admin';
import * as admin from 'firebase-admin';
import { FieldValue } from 'firebase-admin/firestore';
import { signInWithEmailAndPassword, getAuth } from 'firebase/auth';
import { app } from '@/lib/firebase';

interface AuthResult {
    token?: string;
    error?: string;
}

// Helper to map Firebase Admin Auth errors to user-friendly messages
function mapAuthErrorToMessage(errorCode: string): string {
    switch (errorCode) {
        case 'auth/email-already-exists':
            return 'This mobile number is already registered.';
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
             return 'Invalid mobile number or password.';
        case 'auth/invalid-email':
            return 'The provided mobile number is not valid.';
        case 'auth/weak-password':
            return 'Password is too weak. It must be at least 6 characters long.';
        case 'ACCOUNT_BLOCKED':
            return 'Your account has been blocked. Please contact support.';
        default:
            return 'An unexpected error occurred. Please try again.';
    }
}

export async function signUp({ mobile, password, username }: { mobile: string, password: string, username: string }): Promise<AuthResult> {
    try {
        const adminApp = getFirebaseAdmin();
        if (!adminApp) {
            throw new Error("Firebase Admin initialization failed.");
        }
        const authAdmin = admin.auth(adminApp);
        const dbAdmin = admin.firestore(adminApp);

        const email = `${mobile}@authcanvas.dev`;

        const userRecord = await authAdmin.createUser({
            email,
            password,
            displayName: username,
        });

        await dbAdmin.collection('users').doc(userRecord.uid).set({
            uid: userRecord.uid,
            displayName: username,
            mobile: mobile,
            email: email,
            balance: 0,
            bonusBalance: 0,
            totalBonusGiven: 0,
            isAdmin: false,
            isBlocked: false,
            createdAt: FieldValue.serverTimestamp(),
        });
        
        const customToken = await authAdmin.createCustomToken(userRecord.uid);
        return { token: customToken };

    } catch (error: any) {
        console.error('SIGNUP_ERROR:', error);
        return { error: mapAuthErrorToMessage(error.code) };
    }
}


export async function signIn({ mobile, password }: { mobile: string, password: string }): Promise<AuthResult> {
     try {
        const adminApp = getFirebaseAdmin();
        if (!adminApp) {
            throw new Error("Firebase Admin initialization failed.");
        }
        const authAdmin = admin.auth(adminApp);
        const dbAdmin = admin.firestore(adminApp);
        
        const email = `${mobile}@authcanvas.dev`;
        
        // Step 1: Verify password using client SDK temporarily on the server.
        // This is a common pattern when Admin SDK can't verify passwords.
        // The user logs in, we get the ID token, then we can proceed.
        const clientAuth = getAuth(app);
        // This call will fail if password is wrong, and throw an error.
        await signInWithEmailAndPassword(clientAuth, email, password);

        // If password is correct, proceed to get user record with Admin SDK
        const userRecord = await authAdmin.getUserByEmail(email);

        const userDocRef = dbAdmin.collection('users').doc(userRecord.uid);
        const userDoc = await userDocRef.get();

        if (userDoc.exists() && userDoc.data()?.isBlocked) {
            return { error: mapAuthErrorToMessage('ACCOUNT_BLOCKED') };
        }

        const customToken = await authAdmin.createCustomToken(userRecord.uid);

        return { token: customToken };
    } catch (error: any) {
        console.error('SIGNIN_ERROR:', error);
        return { error: mapAuthErrorToMessage(error.code) };
    }
}
