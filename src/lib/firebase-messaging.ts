
'use client';

import { getMessaging, getToken, onMessage } from 'firebase/messaging';
import { app, db } from './firebase';
import { doc, updateDoc, arrayUnion, serverTimestamp, getDoc, setDoc } from 'firebase/firestore';

export const requestForToken = async (userId: string) => {
  if (typeof window === 'undefined' || !('serviceWorker' in navigator)) {
    console.log("Push messaging is not supported");
    return null;
  }
  
  const messaging = getMessaging(app);

  try {
    const permission = await Notification.requestPermission();
    if (permission === 'granted') {
<<<<<<< HEAD
      const currentToken = await getToken(messaging);
=======
      console.log('Notification permission granted.');
      // Get the token
      const currentToken = await getToken(messaging, { 
          serviceWorkerRegistration: await navigator.serviceWorker.ready
      });
>>>>>>> 852cd6ba54575f2177391247dc0e864751a67628
      if (currentToken) {
        console.log('FCM token:', currentToken);
        // Save the token to the user's document in Firestore
        const userDocRef = doc(db, 'users', userId);
        const userDoc = await getDoc(userDocRef);
        
        if (userDoc.exists()) {
            await updateDoc(userDocRef, {
              fcmTokens: arrayUnion(currentToken),
              lastTokenUpdate: serverTimestamp()
            });
        } else {
             // If document doesn't exist, create it. This can happen during signup race conditions.
            await setDoc(userDocRef, {
                fcmTokens: [currentToken],
                lastTokenUpdate: serverTimestamp()
            }, { merge: true });
        }

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
