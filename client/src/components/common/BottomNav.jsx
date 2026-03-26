// Bottom navigation bar — mobile-first fixed bottom nav with 4 tabs

import { NavLink } from 'react-router-dom';
import { Home, ShoppingBag, ClipboardList, User } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';

const BottomNav = () => {
  const { user } = useAuth();

  return (
    <nav className="bottom-nav">
      <NavLink to="/" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`} end>
        <Home size={20} />
        <span>Shop</span>
      </NavLink>
      <NavLink to="/orders" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <ClipboardList size={20} />
        <span>Orders</span>
      </NavLink>
      <NavLink to="/cart" className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <ShoppingBag size={20} />
        <span>Cart</span>
      </NavLink>
      <NavLink to={user ? '/profile' : '/login'} className={({ isActive }) => `bottom-nav-item ${isActive ? 'active' : ''}`}>
        <User size={20} />
        <span>{user ? 'Profile' : 'Login'}</span>
      </NavLink>
    </nav>
  );
};

export default BottomNav;
