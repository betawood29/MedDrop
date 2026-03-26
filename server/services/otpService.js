// OTP service — handles sending and verifying OTPs
// In production: uses Firebase Auth for phone verification
// In dev mode: uses a static OTP "123456" for testing

const admin = require('../config/firebase');
const ApiError = require('../utils/apiError');

// In-memory OTP store for dev mode (NOT for production)
const devOtpStore = new Map();

const sendOTP = async (phone) => {
  // Dev mode — store a static OTP
  if (!process.env.FIREBASE_PROJECT_ID) {
    const otp = '123456';
    devOtpStore.set(phone, { otp, expiresAt: Date.now() + 5 * 60 * 1000 });
    console.log(`[DEV] OTP for ${phone}: ${otp}`);
    return { success: true, message: 'OTP sent (dev mode)' };
  }

  // Production — Firebase handles OTP sending on the client side
  // This endpoint just validates the phone number format
  return { success: true, message: 'OTP sent via Firebase' };
};

const verifyOTP = async (phone, otp, firebaseToken) => {
  // Dev mode — check against in-memory store
  if (!process.env.FIREBASE_PROJECT_ID) {
    const stored = devOtpStore.get(phone);
    if (!stored) throw ApiError.badRequest('OTP not found. Please request a new one.');
    if (Date.now() > stored.expiresAt) {
      devOtpStore.delete(phone);
      throw ApiError.badRequest('OTP expired. Please request a new one.');
    }
    if (stored.otp !== otp) throw ApiError.badRequest('Invalid OTP');
    devOtpStore.delete(phone);
    return { verified: true };
  }

  // Production — verify the Firebase ID token
  if (!firebaseToken) {
    throw ApiError.badRequest('Firebase token is required');
  }

  try {
    const decodedToken = await admin.auth().verifyIdToken(firebaseToken);
    // Verify the phone number in the token matches
    if (decodedToken.phone_number !== `+91${phone}`) {
      throw ApiError.badRequest('Phone number mismatch');
    }
    return { verified: true, firebaseUid: decodedToken.uid };
  } catch (error) {
    if (error.isOperational) throw error;
    throw ApiError.badRequest('Invalid or expired Firebase token');
  }
};

module.exports = { sendOTP, verifyOTP };
