
import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig: FirebaseOptions = {
  apiKey: process.env.next_public_firebase_api_key,
  authDomain: process.env.next_public_firebase_auth_domain,
  databaseURL: process.env.next_public_firebase_database_url,
  projectId: process.env.next_public_firebase_project_id,
  storageBucket: process.env.next_public_firebase_storage_bucket,
  messagingSenderId: process.env.next_public_firebase_messaging_sender_id,
  appId: process.env.next_public_firebase_app_id,
  measurementId: process.env.next_public_firebase_measurement_id,
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

export { app, auth, db, storage };
