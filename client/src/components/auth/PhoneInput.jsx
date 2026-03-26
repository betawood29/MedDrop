// Phone number input step — validates 10-digit Indian phone number

import { useState } from 'react';
import { Phone } from 'lucide-react';
import { isValidPhone } from '../../utils/validators';

const PhoneInput = ({ onSubmit, loading }) => {
  const [phone, setPhone] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValidPhone(phone)) {
      setError('Enter a valid 10-digit phone number');
      return;
    }
    setError('');
    onSubmit(phone);
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-header">
        <span className="auth-icon">💊</span>
        <h1>MedDrop</h1>
        <p>Chitkara University Gate Delivery</p>
      </div>

      <label className="input-label">Phone Number</label>
      <div className="phone-input-group">
        <span className="phone-prefix">+91</span>
        <input
          type="tel"
          value={phone}
          onChange={(e) => setPhone(e.target.value.replace(/\D/g, '').slice(0, 10))}
          placeholder="Enter your phone number"
          maxLength={10}
          className="input"
          autoFocus
        />
      </div>
      {error && <p className="error-text">{error}</p>}

      <button type="submit" className="btn-primary" disabled={loading || phone.length !== 10}>
        {loading ? 'Sending OTP...' : 'Send OTP'}
      </button>
    </form>
  );
};

export default PhoneInput;
