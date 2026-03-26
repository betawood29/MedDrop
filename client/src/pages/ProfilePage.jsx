// Profile page — shows user info, edit profile, logout

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LogOut, User, Phone, Building, MapPin } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { completeProfile } from '../services/authService';
import { GATE_OPTIONS, HOSTEL_OPTIONS } from '../utils/constants';

const ProfilePage = () => {
  const { user, updateUser, logout } = useAuth();
  const navigate = useNavigate();
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({
    name: user?.name || '',
    hostel: user?.hostel || '',
    preferredGate: user?.preferredGate || '',
  });
  const [loading, setLoading] = useState(false);

  const handleSave = async () => {
    setLoading(true);
    try {
      const res = await completeProfile(form);
      updateUser(res.data.data);
      setEditing(false);
      toast.success('Profile updated!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
    toast.success('Logged out');
  };

  return (
    <div className="page-container">
      <h2 className="page-title">Profile</h2>

      <div className="profile-card">
        {editing ? (
          <div className="profile-edit">
            <label className="input-label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />

            <label className="input-label">Hostel</label>
            <select className="input" value={form.hostel} onChange={(e) => setForm({ ...form, hostel: e.target.value })}>
              <option value="">Select</option>
              {HOSTEL_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>

            <label className="input-label">Preferred Gate</label>
            <select className="input" value={form.preferredGate} onChange={(e) => setForm({ ...form, preferredGate: e.target.value })}>
              <option value="">Select</option>
              {GATE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>

            <div className="profile-actions">
              <button className="btn-secondary" onClick={() => setEditing(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={loading}>
                {loading ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        ) : (
          <div className="profile-info">
            <div className="profile-row"><User size={18} /> <span>{user?.name || 'Not set'}</span></div>
            <div className="profile-row"><Phone size={18} /> <span>+91 {user?.phone}</span></div>
            <div className="profile-row"><Building size={18} /> <span>{user?.hostel || 'Not set'}</span></div>
            <div className="profile-row"><MapPin size={18} /> <span>{user?.preferredGate || 'Not set'}</span></div>

            <div className="profile-actions">
              <button className="btn-secondary" onClick={() => setEditing(true)}>Edit Profile</button>
              {user?.role === 'admin' && (
                <button className="btn-secondary" onClick={() => navigate('/admin')}>Admin Panel</button>
              )}
            </div>
          </div>
        )}
      </div>

      <button className="btn-danger logout-btn" onClick={handleLogout}>
        <LogOut size={18} /> Logout
      </button>
    </div>
  );
};

export default ProfilePage;
