
import * as admin from 'firebase-admin';
import { promises as fs } from 'fs';
import path from 'path';

// This function ensures that Firebase Admin is initialized only once.
async function initializeFirebaseAdmin() {
  // If the app is already initialized, return the existing instance.
  if (admin.apps.length > 0) {
    return admin.apps[0]!;
  }

  // Check for local development environment with a service account key
  if (process.env.NODE_ENV === 'development') {
    try {
      const serviceAccountPath = path.resolve(process.cwd(), 'serviceAccountKey.json');
      // Check if serviceAccountKey.json exists and is not empty
      const stats = await fs.stat(serviceAccountPath);
      if (stats.size > 2) { // Check if file is more than just {}
        console.log("Initializing Firebase Admin SDK with local service account key...");
        const serviceAccount = JSON.parse(await fs.readFile(serviceAccountPath, 'utf8'));
        return admin.initializeApp({
          credential: admin.credential.cert(serviceAccount)
        });
      }
    } catch (error: any) {
        if (error.code !== 'ENOENT') { // ENOENT means file not found, which is ok to ignore here.
             console.warn("Could not initialize Firebase Admin with local service account key:", error.message);
        }
    }
  }

  // When deployed to a Google Cloud environment (like Firebase App Hosting),
  // the SDK automatically discovers the service account credentials.
  // This is the recommended and most secure way to initialize.
  try {
    console.log("Initializing Firebase Admin SDK with Application Default Credentials...");
    return admin.initializeApp({
      credential: admin.credential.applicationDefault()
    });
  } catch (error: any) {
    console.error("CRITICAL: Firebase Admin SDK initialization failed completely:", error);
    // This will cause server-side Firebase operations to fail,
    // which is expected if the environment is not configured correctly.
    // Do not throw an error here to allow the app to build, but log it critically.
    return null;
  }
}

let adminAppPromise: Promise<admin.app.App | null> | null = null;

// Export a single async function to get the initialized app instance.
export function getFirebaseAdmin(): Promise<admin.app.App | null> {
    if (!adminAppPromise) {
        adminAppPromise = initializeFirebaseAdmin();
    }
    return adminAppPromise;
}
