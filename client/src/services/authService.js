// Auth service — OTP send/verify, profile completion, current user

import api from './api';

export const sendOtp = (phone) => api.post('/auth/send-otp', { phone });

export const verifyOtp = (phone, otp, firebaseToken) =>
  api.post('/auth/verify-otp', { phone, otp, firebaseToken });

export const completeProfile = (data) => api.post('/auth/complete-profile', data);

export const getMe = () => api.get('/auth/me');
