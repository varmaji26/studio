
// This file must be in the public folder.

importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-app-compat.js");
importScripts("https://www.gstatic.com/firebasejs/10.12.4/firebase-messaging-compat.js");

// Initialize the Firebase app in the service worker by passing in the messagingSenderId.
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

firebase.initializeApp(firebaseConfig);

// Retrieve an instance of Firebase Messaging so that it can handle background messages.
const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/icon.png", // Make sure you have an icon in your public folder
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
