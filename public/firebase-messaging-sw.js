
// Import and initialize the Firebase SDK
// This is required to handle messages when your web app is in the background.
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-app-compat.js');
importScripts('https://www.gstatic.com/firebasejs/10.12.2/firebase-messaging-compat.js');

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


firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log('[firebase-messaging-sw.js] Received background message ', payload);
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: payload.notification.icon || '/icon-192x192.png',
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
