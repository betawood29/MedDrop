// OTP verification step — 6-digit OTP input with auto-submit

import { useState, useRef, useEffect } from 'react';

const OtpVerify = ({ phone, onVerify, onBack, loading }) => {
  const [otp, setOtp] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const inputsRef = useRef([]);

  useEffect(() => {
    inputsRef.current[0]?.focus();
  }, []);

  const handleChange = (index, value) => {
    if (!/^\d*$/.test(value)) return;
    const newOtp = [...otp];
    newOtp[index] = value.slice(-1);
    setOtp(newOtp);
    setError('');

    // Auto-focus next input
    if (value && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (index === 5 && value) {
      const fullOtp = newOtp.join('');
      if (fullOtp.length === 6) onVerify(fullOtp);
    }
  };

  const handleKeyDown = (index, e) => {
    if (e.key === 'Backspace' && !otp[index] && index > 0) {
      inputsRef.current[index - 1]?.focus();
    }
  };

  const handlePaste = (e) => {
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 6) {
      setOtp(pasted.split(''));
      onVerify(pasted);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const fullOtp = otp.join('');
    if (fullOtp.length !== 6) {
      setError('Enter all 6 digits');
      return;
    }
    onVerify(fullOtp);
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-header">
        <h2>Verify OTP</h2>
        <p>Enter the 6-digit code sent to +91 {phone}</p>
      </div>

      <div className="otp-inputs" onPaste={handlePaste}>
        {otp.map((digit, i) => (
          <input
            key={i}
            ref={(el) => (inputsRef.current[i] = el)}
            type="tel"
            value={digit}
            onChange={(e) => handleChange(i, e.target.value)}
            onKeyDown={(e) => handleKeyDown(i, e)}
            maxLength={1}
            className="otp-input"
          />
        ))}
      </div>
      {error && <p className="error-text">{error}</p>}

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Verifying...' : 'Verify OTP'}
      </button>

      <button type="button" className="btn-link" onClick={onBack}>
        Change phone number
      </button>
    </form>
  );
};

export default OtpVerify;
