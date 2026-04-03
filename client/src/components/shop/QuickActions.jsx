// Quick actions — shortcut cards for key sections

import { useNavigate } from 'react-router-dom';
import { Printer, Pill, Coffee, ShoppingBag } from 'lucide-react';

const actions = [
  { icon: <Pill size={22} />, label: 'Medicines', color: '#7c3aed', bg: '#f5f0ff', path: '/category/medicines' },
  { icon: <Coffee size={22} />, label: 'Snacks', color: '#eab308', bg: '#fefce8', path: '/category/snacks' },
  { icon: <Printer size={22} />, label: 'Print Store', color: '#5b21b6', bg: '#ede9fe', path: '/print-store' },
  { icon: <ShoppingBag size={22} />, label: 'All Products', color: '#7c3aed', bg: '#f5f0ff', path: '/category/all' },
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
