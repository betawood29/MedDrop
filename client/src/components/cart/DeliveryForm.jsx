// Delivery form — hostel, gate, payment method selection, and optional note

import { useState } from 'react';
import { Banknote, CreditCard } from 'lucide-react';
import { GATE_OPTIONS, HOSTEL_OPTIONS } from '../../utils/constants';
import { useAuth } from '../../hooks/useAuth';

const DeliveryForm = ({ onSubmit, loading }) => {
  const { user } = useAuth();
  const [hostel, setHostel] = useState(user?.hostel || '');
  const [gate, setGate] = useState(user?.preferredGate || '');
  const [note, setNote] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cod');
  const [error, setError] = useState('');

  const razorpayEnabled = !!import.meta.env.VITE_RAZORPAY_KEY_ID;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!hostel) { setError('Please select your hostel'); return; }
    if (!gate) { setError('Please select pickup gate'); return; }
    setError('');
    onSubmit({ hostel, gate, note, paymentMethod });
  };

  return (
    <form onSubmit={handleSubmit} className="delivery-form">
      <h3>Delivery Details</h3>

      <label className="input-label">Hostel *</label>
      <select value={hostel} onChange={(e) => setHostel(e.target.value)} className="input" required>
        <option value="">Select hostel</option>
        {HOSTEL_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
      </select>

      <label className="input-label">Pickup Gate *</label>
      <select value={gate} onChange={(e) => setGate(e.target.value)} className="input" required>
        <option value="">Select gate</option>
        {GATE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
      </select>

      <label className="input-label">Note (optional)</label>
      <textarea
        value={note}
        onChange={(e) => setNote(e.target.value)}
        placeholder="E.g., call me when you reach gate"
        className="input"
        rows={2}
      />

      <label className="input-label">Payment Method *</label>
      <div className="payment-methods">
        <button
          type="button"
          className={`payment-option ${paymentMethod === 'cod' ? 'active' : ''}`}
          onClick={() => setPaymentMethod('cod')}
        >
          <Banknote size={20} />
          <div>
            <span className="payment-option-title">Cash on Delivery</span>
            <span className="payment-option-desc">Pay when you receive</span>
          </div>
        </button>

        {razorpayEnabled && (
          <button
            type="button"
            className={`payment-option ${paymentMethod === 'upi' ? 'active' : ''}`}
            onClick={() => setPaymentMethod('upi')}
          >
            <CreditCard size={20} />
            <div>
              <span className="payment-option-title">Pay Online</span>
              <span className="payment-option-desc">UPI, Cards, Wallets</span>
            </div>
          </button>
        )}
      </div>

      {error && <p className="error-text">{error}</p>}

      <button type="submit" className="btn-primary" disabled={loading}>
        {loading ? 'Placing Order...' : paymentMethod === 'upi' ? 'Place Order & Pay' : 'Place Order (COD)'}
      </button>
    </form>
  );
};

export default DeliveryForm;
