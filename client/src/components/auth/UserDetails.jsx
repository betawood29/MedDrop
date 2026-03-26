// Profile completion step — name, hostel, preferred gate (shown after first login)

import { useState } from 'react';
import { GATE_OPTIONS, HOSTEL_OPTIONS } from '../../utils/constants';
import { isValidName } from '../../utils/validators';

const UserDetails = ({ onSubmit, loading }) => {
  const [name, setName] = useState('');
  const [hostel, setHostel] = useState('');
  const [gate, setGate] = useState('');
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!isValidName(name)) {
      setError('Name must be at least 2 characters');
      return;
    }
    setError('');
    onSubmit({ name: name.trim(), hostel, preferredGate: gate });
  };

  return (
    <form onSubmit={handleSubmit} className="auth-form">
      <div className="auth-header">
        <h2>Complete Profile</h2>
        <p>Tell us a bit about yourself</p>
      </div>

      <label className="input-label">Name *</label>
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Your name"
        className="input"
        autoFocus
      />

      <label className="input-label">Hostel</label>
      <select value={hostel} onChange={(e) => setHostel(e.target.value)} className="input">
        <option value="">Select hostel (optional)</option>
        {HOSTEL_OPTIONS.map((h) => (
          <option key={h} value={h}>{h}</option>
        ))}
      </select>

      <label className="input-label">Preferred Gate</label>
      <select value={gate} onChange={(e) => setGate(e.target.value)} className="input">
        <option value="">Select gate (optional)</option>
        {GATE_OPTIONS.map((g) => (
          <option key={g} value={g}>{g}</option>
        ))}
      </select>

      {error && <p className="error-text">{error}</p>}

      <button type="submit" className="btn-primary" disabled={loading || !name.trim()}>
        {loading ? 'Saving...' : 'Start Shopping'}
      </button>
    </form>
  );
};

export default UserDetails;
