// Login page — 2-step flow for returning users: phone → OTP → home
// New users are redirected to /signup

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import PhoneInput from '../components/auth/PhoneInput';
import OtpVerify from '../components/auth/OtpVerify';
import { useAuth } from '../hooks/useAuth';
import { verifyOtp as verifyOtpApi } from '../services/authService';

// Initialize Firebase client SDK
const firebaseConfig = {
  apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
  authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
  projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
  storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
  appId: import.meta.env.VITE_FIREBASE_APP_ID,
};

let firebaseApp;
try { firebaseApp = initializeApp(firebaseConfig); } catch { /* already initialized */ }
const auth = getAuth(firebaseApp);

const LoginPage = () => {
  const [step, setStep] = useState('phone'); // phone | otp
  const [phone, setPhone] = useState('');
  const [confirmResult, setConfirmResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();

  // Step 1: Send OTP via Firebase
  const handleSendOtp = async (phoneNumber) => {
    setLoading(true);
    setPhone(phoneNumber);
    try {
      if (!window.recaptchaVerifier) {
        window.recaptchaVerifier = new RecaptchaVerifier(auth, 'recaptcha-container', {
          size: 'invisible',
        });
      }
      const result = await signInWithPhoneNumber(auth, `+91${phoneNumber}`, window.recaptchaVerifier);
      setConfirmResult(result);
      setStep('otp');
      toast.success('OTP sent!');
    } catch (err) {
      console.error('OTP send error:', err);
      toast.error(err.message || 'Failed to send OTP. Try again.');
      window.recaptchaVerifier = null;
    } finally {
      setLoading(false);
    }
  };

  // Step 2: Verify OTP
  const handleVerifyOtp = async (otp) => {
    setLoading(true);
    try {
      const firebaseResult = await confirmResult.confirm(otp);
      const firebaseToken = await firebaseResult.user.getIdToken();

      const res = await verifyOtpApi(phone, otp, firebaseToken);
      const { token, user, isNewUser } = res.data.data;

      if (isNewUser || !user.name) {
        // New user — redirect to signup page
        toast('No account found. Please sign up first.');
        navigate('/signup');
        return;
      }

      // Existing user — log in and go home
      login(token, user);

      if (user.role === 'admin') {
        toast.success('Welcome back, Admin!');
        navigate('/admin');
      } else {
        toast.success('Welcome back!');
        navigate('/');
      }
    } catch (err) {
      console.error('OTP verify error:', err);
      toast.error(err.response?.data?.message || err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div id="recaptcha-container" />
      {step === 'phone' && (
        <>
          <PhoneInput onSubmit={handleSendOtp} loading={loading} />
          <div className="auth-switch">
            New here? <Link to="/signup">Create an account</Link>
          </div>
        </>
      )}
      {step === 'otp' && (
        <OtpVerify phone={phone} onVerify={handleVerifyOtp} onBack={() => setStep('phone')} loading={loading} />
      )}
    </div>
  );
};

export default LoginPage;
