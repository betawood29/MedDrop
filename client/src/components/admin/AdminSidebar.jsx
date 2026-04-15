// Admin sidebar navigation — with separate shop/print order notification badges

import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Package, Upload, FolderTree, Image, LogOut, FileText } from 'lucide-react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../../utils/constants';

const AdminSidebar = ({ onLogout }) => {
  const [shopCount, setShopCount] = useState(0);
  const [printCount, setPrintCount] = useState(0);
  const [rxCount, setRxCount] = useState(0);
  const socketRef = useRef(null);
  const location = useLocation();

  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket', 'polling'] });
    socketRef.current = socket;
    socket.on('connect', () => socket.emit('join-admin'));
    socket.on('new-order', (data) => {
      if (data?.type === 'print') {
        setPrintCount((c) => c + 1);
      } else {
        setShopCount((c) => c + 1);
      }
    });
    socket.on('new-prescription', () => setRxCount((c) => c + 1));
    return () => socket.disconnect();
  }, []);

  // Clear badges when visiting relevant pages
  useEffect(() => {
    if (location.pathname.startsWith('/admin/orders')) {
      setShopCount(0);
      setPrintCount(0);
    }
    if (location.pathname.startsWith('/admin/prescriptions')) {
      setRxCount(0);
    }
  }, [location.pathname]);

  const totalBadge = shopCount + printCount;

  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <span>💊</span> MedDrop Admin
      </div>
      <nav className="admin-nav">
        <NavLink to="/admin" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
          <LayoutDashboard size={18} /><span>Dashboard</span>
        </NavLink>

        <NavLink to="/admin/orders" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
          <ShoppingBag size={18} />
          <span>Orders</span>
          {totalBadge > 0 && (
            <span className="admin-badge-group">
              {shopCount > 0 && <span className="admin-badge shop" title="Shop orders">{shopCount}</span>}
              {printCount > 0 && <span className="admin-badge print" title="Print orders">{printCount}</span>}
            </span>
          )}
        </NavLink>

        <NavLink to="/admin/products" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
          <Package size={18} /><span>Products</span>
        </NavLink>
        <NavLink to="/admin/upload" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
          <Upload size={18} /><span>Excel Upload</span>
        </NavLink>
        <NavLink to="/admin/categories" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
          <FolderTree size={18} /><span>Categories</span>
        </NavLink>
        <NavLink to="/admin/banner" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
          <Image size={18} /><span>Banner</span>
        </NavLink>
        <NavLink to="/admin/prescriptions" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}>
          <FileText size={18} /><span>Prescriptions</span>
          {rxCount > 0 && <span className="admin-badge shop">{rxCount}</span>}
        </NavLink>
      </nav>
      <button className="admin-nav-item logout" onClick={onLogout}>
        <LogOut size={18} /><span>Logout</span>
      </button>
    </aside>
  );
};

export default AdminSidebar;
