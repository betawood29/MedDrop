// Admin sidebar navigation — desktop sidebar / mobile top tabs

import { NavLink } from 'react-router-dom';
import { LayoutDashboard, ShoppingBag, Package, Upload, FolderTree, LogOut } from 'lucide-react';

const links = [
  { to: '/admin', icon: LayoutDashboard, label: 'Dashboard', end: true },
  { to: '/admin/orders', icon: ShoppingBag, label: 'Orders' },
  { to: '/admin/products', icon: Package, label: 'Products' },
  { to: '/admin/upload', icon: Upload, label: 'Excel Upload' },
  { to: '/admin/categories', icon: FolderTree, label: 'Categories' },
];

const AdminSidebar = ({ onLogout }) => {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-brand">
        <span>💊</span> MedDrop Admin
      </div>
      <nav className="admin-nav">
        {links.map(({ to, icon: Icon, label, end }) => (
          <NavLink
            key={to}
            to={to}
            end={end}
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            <Icon size={18} />
            <span>{label}</span>
          </NavLink>
        ))}
      </nav>
      <button className="admin-nav-item logout" onClick={onLogout}>
        <LogOut size={18} />
        <span>Logout</span>
      </button>
    </aside>
  );
};

export default AdminSidebar;
