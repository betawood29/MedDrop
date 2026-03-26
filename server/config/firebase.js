// Firebase Admin SDK initialization for phone OTP verification
// Set FIREBASE_PROJECT_ID, FIREBASE_PRIVATE_KEY, FIREBASE_CLIENT_EMAIL in .env

const admin = require('firebase-admin');

// Only initialize if credentials are provided (skip in dev mode)
if (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY) {
  admin.initializeApp({
    credential: admin.credential.cert({
      projectId: process.env.FIREBASE_PROJECT_ID,
      clientEmail: process.env.FIREBASE_CLIENT_EMAIL,
      // Replace escaped newlines in the private key
      privateKey: process.env.FIREBASE_PRIVATE_KEY.replace(/\\n/g, '\n'),
    }),
  });
  console.log('Firebase Admin initialized');
} else {
  console.log('Firebase credentials not set — OTP verification will use dev mode');
}

module.exports = admin;
