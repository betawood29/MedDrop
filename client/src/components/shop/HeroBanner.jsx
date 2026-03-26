// Hero banner — Blinkit-style promotional banner at top of homepage

import { useNavigate } from 'react-router-dom';
import { Clock, Truck } from 'lucide-react';

const HeroBanner = () => {
  const navigate = useNavigate();

  return (
    <div className="hero-banner">
      <div className="hero-content">
        <div className="hero-delivery-tag">
          <Clock size={14} />
          <span>Delivery in 15–30 mins</span>
        </div>
        <h1 className="hero-title">
          Medicines & Essentials<br />
          <span className="hero-highlight">at your hostel gate</span>
        </h1>
        <p className="hero-subtitle">Chitkara University Campus Delivery</p>
        <div className="hero-features">
          <div className="hero-feature">
            <Truck size={16} />
            <span>Free delivery above ₹299</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default HeroBanner;
