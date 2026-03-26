// Admin layout — wraps admin pages with sidebar, handles admin auth

import { useState, useEffect } from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { LayoutDashboard, ShoppingBag, Package, Upload, FolderTree, LogOut } from 'lucide-react';
import AdminSidebar from '../../components/admin/AdminSidebar';
import Loader from '../../components/common/Loader';
import { useAuth } from '../../hooks/useAuth';
import { adminLogin } from '../../services/adminService';

const AdminLayout = () => {
  const [authenticated, setAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [loginForm, setLoginForm] = useState({ phone: '', password: '' });
  const [loginLoading, setLoginLoading] = useState(false);
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    const adminToken = localStorage.getItem('adminToken');
    const userToken = localStorage.getItem('token');

    if (adminToken) {
      // Logged in via admin phone+password login
      setAuthenticated(true);
    } else if (user?.role === 'admin' && userToken) {
      // Admin-role user logged in via OTP — use their user token for admin API calls
      localStorage.setItem('adminToken', userToken);
      setAuthenticated(true);
    }
    setLoading(false);
  }, [user]);

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoginLoading(true);
    try {
      const res = await adminLogin(loginForm.phone, loginForm.password);
      localStorage.setItem('adminToken', res.data.data.token);
      setAuthenticated(true);
      toast.success('Admin login successful!');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Login failed');
    } finally {
      setLoginLoading(false);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('adminToken');
    setAuthenticated(false);
    navigate('/');
  };

  if (loading) return <Loader fullscreen />;

  if (!authenticated) {
    return (
      <div className="admin-login-page">
        <form onSubmit={handleLogin} className="auth-form">
          <div className="auth-header">
            <span className="auth-icon">🔐</span>
            <h2>Admin Login</h2>
          </div>
          <label className="input-label">Phone</label>
          <input className="input" type="tel" value={loginForm.phone}
            onChange={(e) => setLoginForm({ ...loginForm, phone: e.target.value })} placeholder="Admin phone" required />
          <label className="input-label">Password</label>
          <input className="input" type="password" value={loginForm.password}
            onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })} placeholder="Password" required />
          <button className="btn-primary" type="submit" disabled={loginLoading}>
            {loginLoading ? 'Logging in...' : 'Login'}
          </button>
        </form>
      </div>
    );
  }

  return (
    <div className="admin-layout">
      <AdminSidebar onLogout={handleLogout} />
      {/* Mobile admin top tabs (visible only on mobile when sidebar is hidden) */}
      <div className="admin-mobile-nav">
        <NavLink to="/admin" end className={({ isActive }) => isActive ? 'active' : ''}><LayoutDashboard size={16} /> Dashboard</NavLink>
        <NavLink to="/admin/orders" className={({ isActive }) => isActive ? 'active' : ''}><ShoppingBag size={16} /> Orders</NavLink>
        <NavLink to="/admin/products" className={({ isActive }) => isActive ? 'active' : ''}><Package size={16} /> Products</NavLink>
        <NavLink to="/admin/upload" className={({ isActive }) => isActive ? 'active' : ''}><Upload size={16} /> Upload</NavLink>
        <NavLink to="/admin/categories" className={({ isActive }) => isActive ? 'active' : ''}><FolderTree size={16} /> Categories</NavLink>
        <button onClick={handleLogout}><LogOut size={16} /> Logout</button>
      </div>
      <main className="admin-content">
        <Outlet />
      </main>
    </div>
  );
};

export default AdminLayout;
