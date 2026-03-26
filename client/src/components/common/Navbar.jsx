// Top navigation bar — Blinkit-style green header with logo, location hint, and cart/profile

import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, User, MapPin } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { useAuth } from '../../hooks/useAuth';

const Navbar = () => {
  const { itemCount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  return (
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
  );
};

export default Navbar;
