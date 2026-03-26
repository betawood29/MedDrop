// Quick actions — shortcut cards for key features (like Blinkit's top row)

import { useNavigate } from 'react-router-dom';
import { Printer, Pill, Coffee, ShoppingBag } from 'lucide-react';

const actions = [
  { icon: <Pill size={20} />, label: 'Medicines', color: '#10b981', path: '/category/medicines' },
  { icon: <Coffee size={20} />, label: 'Snacks', color: '#f59e0b', path: '/category/snacks' },
  { icon: <Printer size={20} />, label: 'Print Store', color: '#8b5cf6', path: '/print-store' },
  { icon: <ShoppingBag size={20} />, label: 'All Products', color: '#3b82f6', path: '/category/all' },
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
          <div className="quick-action-icon" style={{ background: `${action.color}15`, color: action.color }}>
            {action.icon}
          </div>
          <span className="quick-action-label">{action.label}</span>
        </button>
      ))}
    </div>
  );
};

export default QuickActions;
