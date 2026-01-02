
'use client';

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app, db } from './firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp } from 'firebase/firestore';

export const requestForToken = async (userId: string) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log("Push messaging is not supported");
    return null;
  }
  
  const messaging = getMessaging(app);

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
      console.log('Notification permission granted.');
      // Get the token
      const currentToken = await getToken(messaging, { 
          serviceWorkerRegistration: await navigator.serviceWorker.ready
      });
      if (currentToken) {
        console.log('FCM token:', currentToken);
        // Save the token to the user's document in Firestore
        const userDocRef = doc(db, 'users', userId);
        await updateDoc(userDocRef, {
          fcmTokens: arrayUnion(currentToken),
          lastTokenUpdate: serverTimestamp()
        });
        return currentToken;
      } else {
        console.log('No registration token available. Request permission to generate one.');
        return null;
      }
    } else {
      console.log('Unable to get permission to notify.');
      return null;
    }
  } catch (err) {
    console.error('An error occurred while retrieving token. ', err);
    return null;
  }
};

export const onMessageListener = () =>
  new Promise((resolve) => {
    if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
      const messaging = getMessaging(app);
      onMessage(messaging, (payload) => {
        resolve(payload);
      });
    }
  });
