
import { initializeApp, getApps, getApp, FirebaseOptions } from 'firebase/app';
import { getAuth, onAuthStateChanged, type User } from 'firebase/auth';
import { getFirestore, doc, setDoc, getDoc } from 'firebase/firestore';
import { getStorage } from 'firebase/storage';

const firebaseConfig: FirebaseOptions = {
  "projectId": "auth-canvas",
  "appId": "1:645923871999:web:848febd795743ae4e4c0ca",
  "storageBucket": "auth-canvas.appspot.com",
  "apiKey": "AIzaSyDEZ0vQLJ2kY_3_pdWqZw7OjJVoQvoeJjM",
  "authDomain": "",
  "messagingSenderId": "645923871999"
};

// Initialize Firebase
const app = getApps().length ? getApp() : initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const storage = getStorage(app);

// Function to ensure the admin user has the isAdmin flag.
// This should run once when the admin logs in.
const ensureAdminUser = async (user: User) => {
  if (user.email === '8080601370@authcanvas.dev') {
    const adminUserRef = doc(db, 'users', user.uid);
    try {
      const docSnap = await getDoc(adminUserRef);
      // Only write if the flag is missing or false to avoid unnecessary writes.
      if (!docSnap.exists() || !docSnap.data().isAdmin) {
        console.log('Setting admin flag for user:', user.uid);
        // Use setDoc with merge:true to create or update the document without overwriting other fields.
        await setDoc(adminUserRef, { isAdmin: true }, { merge: true });
        console.log('Admin flag set successfully.');
      }
    } catch (error) {
       console.error("Error ensuring admin user:", error);
    }
  }
};

// Listen for auth state changes to run the admin check
onAuthStateChanged(auth, (user) => {
  if (user) {
    ensureAdminUser(user).catch(console.error);
  }
});


export { app, auth, db, storage };
