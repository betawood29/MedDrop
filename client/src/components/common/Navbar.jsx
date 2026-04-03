// Top navigation bar — responsive: mobile search pill + desktop nav links
// Bottom nav hidden on 769px+, so navbar shows Orders/Profile links on desktop

import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, User, MapPin, Search, ClipboardList, Home } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';
import GlobalSearch from './GlobalSearch';

const Navbar = () => {
  const { itemCount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [showSearch, setShowSearch] = useState(false);

  return (
    <>
      <nav className="navbar">
        <div className="navbar-left">
          <Link to="/" className="navbar-brand">
            <span className="brand-icon">💊</span>
            <div className="brand-info">
              <span className="brand-text">MedDrop</span>
              {user?.hostel && (
                <span className="brand-location">
                  <MapPin size={10} /> {user.hostel}
                </span>
              )}
            </div>
          </Link>
        </div>

        {/* Tappable search bar in center */}
        <div className="navbar-search" onClick={() => setShowSearch(true)}>
          <Search size={15} />
          <span>Search products...</span>
        </div>

        {/* Desktop nav links (hidden on mobile, shown when bottom-nav is hidden) */}
        <div className="navbar-desktop-links">
          <Link to="/" className={`navbar-link ${location.pathname === '/' ? 'active' : ''}`}>
            <Home size={18} /> Home
          </Link>
          <Link to="/category/all" className={`navbar-link ${location.pathname.startsWith('/category') ? 'active' : ''}`}>
            <Search size={18} /> Browse
          </Link>
          {user && (
            <Link to="/orders" className={`navbar-link ${location.pathname.startsWith('/orders') ? 'active' : ''}`}>
              <ClipboardList size={18} /> Orders
            </Link>
          )}
        </div>

        <div className="navbar-actions">
          <button className="icon-btn" onClick={() => navigate('/cart')} aria-label="Cart">
            <ShoppingCart size={22} />
            {itemCount > 0 && <span className="badge">{itemCount}</span>}
          </button>
          {user ? (
            <button className="icon-btn" onClick={() => navigate('/profile')} aria-label="Profile">
              <User size={22} />
            </button>
          ) : (
            <button className="btn-sm" onClick={() => navigate('/login')}>Login</button>
          )}
        </div>
      </nav>

      {showSearch && <GlobalSearch onClose={() => setShowSearch(false)} />}
    </>
  );
};

export default Navbar;
