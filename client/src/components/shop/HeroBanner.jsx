// Hero banner — full background image with gradient overlay and CTA

import { useNavigate } from 'react-router-dom';
import { Truck, ShieldCheck, Clock, Zap, ArrowRight } from 'lucide-react';

const HeroBanner = () => {
  const navigate = useNavigate();

  return (
    <div className="hero-banner" onClick={() => navigate('/category/all')} style={{ cursor: 'pointer' }}>
      <div className="hero-content">
        <div className="hero-delivery-tag">
          <Zap size={10} />
          <span>Delivery in 15–30 mins</span>
        </div>
        <h1 className="hero-title">
          Deals picked<br />
          <span className="hero-highlight">for you</span>
        </h1>
        <p className="hero-subtitle">Weekly offers on medicines, snacks and so much more.</p>
        <div className="hero-features">
          <div className="hero-feature">
            <Truck size={12} />
            <span>Free above ₹299</span>
          </div>
          <div className="hero-feature">
            <ShieldCheck size={12} />
            <span>100% Genuine</span>
          </div>
          <div className="hero-feature">
            <Clock size={12} />
            <span>24/7 Available</span>
          </div>
        </div>
        <button className="hero-cta-btn" onClick={(e) => { e.stopPropagation(); navigate('/category/all'); }}>
          Shop Now <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default HeroBanner;
