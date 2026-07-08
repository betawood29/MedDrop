// Admin sidebar navigation — with separate shop/print order notification badges

import { useState, useEffect, useRef } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Package, Upload, FolderTree, Image, LogOut, FileText, ChevronLeft, ChevronRight } from 'lucide-react';
import io from 'socket.io-client';
import { SOCKET_URL } from '../../utils/constants';

const AdminSidebar = ({ onLogout, collapsed, onToggle }) => {
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

  // Clear badges when visiting relevant pages — intentionally synchronizes with
  // navigation (an external-to-React event), not derivable during render.
  useEffect(() => {
    if (location.pathname.startsWith('/admin/orders')) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setShopCount(0);
      setPrintCount(0);
    }
    if (location.pathname.startsWith('/admin/prescriptions')) {
      setRxCount(0);
    }
  }, [location.pathname]);

  const totalBadge = shopCount + printCount;

  return (
    <aside className={`admin-sidebar${collapsed ? ' collapsed' : ''}`}>
      <div className="admin-sidebar-brand">
        <img src="/MEddrop.png" alt="MedDrop" className="admin-brand-logo" />
        <span className="nav-label">MedDrop Admin</span>
        <button className="sidebar-toggle-btn" onClick={onToggle} aria-label={collapsed ? 'Expand sidebar' : 'Collapse sidebar'}>
          {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
        </button>
      </div>
      <nav className="admin-nav">
        <NavLink to="/admin" end className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} title="Dashboard">
          <LayoutDashboard size={18} /><span className="nav-label">Dashboard</span>
        </NavLink>

        <NavLink to="/admin/orders" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} title="Orders">
          <ShoppingBag size={18} />
          <span className="nav-label">Orders</span>
          {totalBadge > 0 && (
            <span className="admin-badge-group">
              {shopCount > 0 && <span className="admin-badge shop" title="Shop orders">{shopCount}</span>}
              {printCount > 0 && <span className="admin-badge print" title="Print orders">{printCount}</span>}
            </span>
          )}
        </NavLink>

        <NavLink to="/admin/products" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} title="Products">
          <Package size={18} /><span className="nav-label">Products</span>
        </NavLink>
        <NavLink to="/admin/upload" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} title="Excel Upload">
          <Upload size={18} /><span className="nav-label">Excel Upload</span>
        </NavLink>
        <NavLink to="/admin/categories" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} title="Categories">
          <FolderTree size={18} /><span className="nav-label">Categories</span>
        </NavLink>
        <NavLink to="/admin/banner" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} title="Banner">
          <Image size={18} /><span className="nav-label">Banner</span>
        </NavLink>
        <NavLink to="/admin/prescriptions" className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`} title="Prescriptions">
          <FileText size={18} /><span className="nav-label">Prescriptions</span>
          {rxCount > 0 && <span className="admin-badge shop">{rxCount}</span>}
        </NavLink>
      </nav>
      <button className="admin-nav-item logout" onClick={onLogout} title="Logout">
        <LogOut size={18} /><span className="nav-label">Logout</span>
      </button>
    </aside>
  );
};

export default AdminSidebar;
