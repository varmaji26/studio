
import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth, signInWithCustomToken } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY || "AIzaSyCTncE_u2wUR8W3ptwlRuDG4wmCjI6bF-w",
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN || "matka-king-66ec3.firebaseapp.com",
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID || "matka-king-66ec3",
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET || "matka-king-66ec3.appspot.com",
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID || "358988541311",
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID || "1:358988541311:web:03491fbc1031220e16be4a",
  databaseURL: "https://matka-king-66ec3-default-rtdb.firebaseio.com",
  measurementId: "G-GFZW681BYB"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Conditionally initialize messaging
const messaging = (async () => {
    if (typeof window !== 'undefined' && (await isSupported())) {
        return getMessaging(app);
    }
    return undefined;
})();


export { app, auth, db, storage, messaging, signInWithCustomToken };
