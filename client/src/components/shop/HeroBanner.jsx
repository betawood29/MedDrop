// Hero banner — dynamic banner fetched from API, with fallback defaults

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Truck, ShieldCheck, ArrowRight, CalendarClock } from 'lucide-react';
import { getActiveBanner } from '../../services/bannerService';
import { getDeliveryInfo } from '../../utils/constants';

const fallback = {
  title: 'Medicines & Essentials',
  highlight: 'delivered to your gate',
  subtitle: 'Chitkara University Campus Delivery',
  image: '/bnr.jpeg',
  link: '/category/all',
  features: ['Free delivery above ₹199', '100% Genuine', 'Scheduled Delivery'],
};

const featureIcons = [Truck, ShieldCheck, CalendarClock];

const HeroBanner = () => {
  const navigate = useNavigate();
  const [banner, setBanner] = useState(fallback);

  useEffect(() => {
    getActiveBanner()
      .then((res) => {
        if (res.data.data) setBanner({ ...fallback, ...res.data.data });
      })
      .catch(() => {});
  }, []);

  return (
    <div className="hero-banner" onClick={() => navigate(banner.link || '/category/all')} style={{ cursor: 'pointer' }}>
      <img src={banner.image || '/bnr.jpeg'} alt="MedDrop Banner" loading="eager" />
      <div className="hero-content">
        <div className="hero-delivery-tag">
          <CalendarClock size={10} />
          <span>Delivery {getDeliveryInfo().label}</span>
        </div>
        <h1 className="hero-title">
          {banner.title}<br />
          <span className="hero-highlight">{banner.highlight}</span>
        </h1>
        <p className="hero-subtitle">{banner.subtitle}</p>
        <div className="hero-features">
          {(banner.features || []).map((feat, i) => {
            const Icon = featureIcons[i] || ShieldCheck;
            return (
              <div key={i} className="hero-feature">
                <Icon size={12} />
                <span>{feat}</span>
              </div>
            );
          })}
        </div>
        <button className="hero-cta-btn" onClick={(e) => { e.stopPropagation(); navigate(banner.link || '/category/all'); }}>
          Shop Now <ArrowRight size={14} />
        </button>
      </div>
    </div>
  );
};

export default HeroBanner;
