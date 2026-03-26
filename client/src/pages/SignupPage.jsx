// Signup page — 3-step flow for new users: phone → OTP → profile completion

import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import toast from 'react-hot-toast';
import { initializeApp } from 'firebase/app';
import { getAuth, RecaptchaVerifier, signInWithPhoneNumber } from 'firebase/auth';
import PhoneInput from '../components/auth/PhoneInput';
import OtpVerify from '../components/auth/OtpVerify';
import UserDetails from '../components/auth/UserDetails';
import { useAuth } from '../hooks/useAuth';
import { verifyOtp as verifyOtpApi, completeProfile } from '../services/authService';

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

const SignupPage = () => {
  const [step, setStep] = useState('phone'); // phone | otp | profile
  const [phone, setPhone] = useState('');
  const [confirmResult, setConfirmResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const { login, updateUser } = useAuth();
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

      login(token, user);

      if (!isNewUser && user.name) {
        // Already registered user — redirect to login
        toast('You already have an account. Redirecting to home.');
        navigate('/');
      } else {
        // New user — proceed to profile completion
        setStep('profile');
      }
    } catch (err) {
      console.error('OTP verify error:', err);
      toast.error(err.response?.data?.message || err.message || 'Invalid OTP');
    } finally {
      setLoading(false);
    }
  };

  // Step 3: Complete profile
  const handleCompleteProfile = async (data) => {
    setLoading(true);
    try {
      const res = await completeProfile(data);
      updateUser(res.data.data);
      toast.success('Account created! Happy shopping!');
      navigate('/');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save profile');
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
            Already have an account? <Link to="/login">Login</Link>
          </div>
        </>
      )}
      {step === 'otp' && (
        <OtpVerify phone={phone} onVerify={handleVerifyOtp} onBack={() => setStep('phone')} loading={loading} />
      )}
      {step === 'profile' && <UserDetails onSubmit={handleCompleteProfile} loading={loading} />}
    </div>
  );
};

export default SignupPage;
