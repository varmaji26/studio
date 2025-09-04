

import { initializeApp, getApps, getApp, type FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';
import { getMessaging, isSupported } from 'firebase/messaging';

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyCTncE_u2wUR8W3ptwlRuDG4wmCjI6bF-w",
  authDomain: "matka-king-66ec3.firebaseapp.com",
  databaseURL: "https://matka-king-66ec3-default-rtdb.firebaseio.com",
  projectId: "matka-king-66ec3",
  storageBucket: "matka-king-66ec3.appspot.com",
  messagingSenderId: "358988541311",
  appId: "1:358988541311:web:03491fbc1031220e16be4a",
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


export { app, auth, db, storage, messaging };
