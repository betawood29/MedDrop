// Hero banner — full-width image with text overlay on the left

import { useNavigate } from 'react-router-dom';
import { ArrowRight } from 'lucide-react';

const HeroBanner = () => {
  const navigate = useNavigate();

  return (
    <div className="hero-banner" onClick={() => navigate('/category/all')} style={{ cursor: 'pointer' }}>
      <img src="/bannerimg.jpg" alt="MedDrop" loading="eager" />
      <div className="hero-content">
        <h1 className="hero-title">
          Deals picked<br />
          <span className="hero-highlight">for you</span>
        </h1>
        <p className="hero-subtitle">Medicines, snacks & more — delivered in 15-30 mins</p>
        <button className="hero-cta-btn" onClick={(e) => { e.stopPropagation(); navigate('/category/all'); }}>
          Shop Now <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default HeroBanner;
