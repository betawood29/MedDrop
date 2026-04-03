// Quick actions — shortcut cards for key sections

import { useNavigate } from 'react-router-dom';
import { Printer, Pill, Coffee, ShoppingBag } from 'lucide-react';

const actions = [
  { icon: <Pill size={22} />, label: 'Medicines', color: '#dc2626', bg: '#fef2f2', path: '/category/medicines' },
  { icon: <Coffee size={22} />, label: 'Snacks', color: '#d97706', bg: '#fffbeb', path: '/category/snacks' },
  { icon: <Printer size={22} />, label: 'Print Store', color: '#b91c1c', bg: '#fef2f2', path: '/print-store' },
  { icon: <ShoppingBag size={22} />, label: 'All Products', color: '#dc2626', bg: '#fef2f2', path: '/category/all' },
];

const QuickActions = () => {
  const navigate = useNavigate();

  return (
    <div className="quick-actions">
      {actions.map((action) => (
        <button
          key={action.label}
          className="quick-action-btn"
          onClick={() => navigate(action.path)}
        >
          <div className="quick-action-icon" style={{ background: action.bg, color: action.color }}>
            {action.icon}
          </div>
          <span className="quick-action-label">{action.label}</span>
        </button>
      ))}
    </div>
  );
};

export default QuickActions;
