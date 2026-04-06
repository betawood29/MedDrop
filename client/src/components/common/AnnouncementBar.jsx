// Announcement bar — slim scrolling ticker below navbar on homepage

import { useLocation } from 'react-router-dom';
import { getDeliveryInfo } from '../../utils/constants';

const AnnouncementBar = () => {
  const location = useLocation();

  // Only show on homepage and category pages
  if (location.pathname !== '/' && !location.pathname.startsWith('/category')) return null;

  const { label } = getDeliveryInfo();

  const items = [
    `Order before 4 PM — get Same-day delivery `,
    `upcoming delivery — ${label}`,
    'Free delivery on orders above ₹199',
    '100% Genuine Products',
    'Delivered to your hostel gate',
  ];

  // Duplicate for seamless loop
  const track = [...items, ...items];

  return (
    <div className="announcement-bar">
      <div className="announcement-track">
        {track.map((text, i) => (
          <span key={i} className="announcement-item">
            {text}
            <span className="announcement-dot" />
          </span>
        ))}
      </div>
    </div>
  );
};

export default AnnouncementBar;
