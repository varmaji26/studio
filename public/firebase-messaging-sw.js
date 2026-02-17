// Import the Firebase app and messaging services
import { initializeApp } from "firebase/app";
import { getMessaging } from "firebase/messaging/sw";

// Your web app's Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCTncE_u2wUR8W3ptwlRuDG4wmCjI6bF-w",
  authDomain: "matka-king-66ec3.firebaseapp.com",
  projectId: "matka-king-66ec3",
  storageBucket: "matka-king-66ec3.firebasestorage.app",
  messagingSenderId: "358988541311",
  appId: "1:358988541311:web:03491fbc1031220e16be4a",
  databaseURL: "https://matka-king-66ec3-default-rtdb.firebaseio.com",
  measurementId: "G-GFZW681BYB"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

// You can add background message handling here if needed.
