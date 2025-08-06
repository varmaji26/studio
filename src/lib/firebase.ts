import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig: FirebaseOptions = {
  apiKey: "AIzaSyDEZ0vQLJ2kY_3_pdWqZw7OjJVoQvoeJjM",
  authDomain: "auth-canvas.firebaseapp.com",
  projectId: "auth-canvas",
  storageBucket: "auth-canvas.appspot.com",
  messagingSenderId: "645923871999",
  appId: "1:645923871999:web:848febd795743ae4e4c0ca"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
