// This service worker file is intentionally left almost empty.
// Firebase will add its own logic here when initialized in the client.
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-app.js");
importScripts("https://www.gstatic.com/firebasejs/8.10.1/firebase-messaging.js");

// Your web app's Firebase configuration
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

// Initialize Firebase
firebase.initializeApp(firebaseConfig);

const messaging = firebase.messaging();

messaging.onBackgroundMessage((payload) => {
  console.log(
    "[firebase-messaging-sw.js] Received background message ",
    payload
  );
  const notificationTitle = payload.notification.title;
  const notificationOptions = {
    body: payload.notification.body,
    icon: "/favicon.ico", // You can change this to your app's icon
  };

  self.registration.showNotification(notificationTitle, notificationOptions);
});
