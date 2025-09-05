// This service worker can be customized!
// See https://developers.google.com/web/tools/workbox/modules/workbox-sw

// This service worker is a separate file that runs in the background.
// It can't share code with the rest of your app, but it can
// import other files and libraries.

import { initializeApp } from "firebase/app";
import { getMessaging, onBackgroundMessage } from "firebase/messaging/sw";

const firebaseConfig = {
  apiKey: "AIzaSyCTncE_u2wUR8W3ptwlRuDG4wmCjI6bF-w",
  authDomain: "matka-king-66ec3.firebaseapp.com",
  databaseURL: "https://matka-king-66ec3-default-rtdb.firebaseio.com",
  projectId: "matka-king-66ec3",
  storageBucket: "matka-king-66ec3.appspot.com",
  messagingSenderId: "358988541311",
  appId: "1:358988541311:web:03491fbc1031220e16be4a",
  measurementId: "G-GFZW681BYB"
};

const app = initializeApp(firebaseConfig);
const messaging = getMessaging(app);

onBackgroundMessage(messaging, (payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  
  const notificationTitle = payload.notification?.title || 'New Notification';
  const notificationOptions = {
    body: payload.notification?.body || 'You have a new message.',
    icon: '/icon-192x192.png' // Path to your icon in the public folder
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
