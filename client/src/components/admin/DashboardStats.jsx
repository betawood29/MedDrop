// Dashboard stats cards — today's orders, revenue, pending, products

import { ShoppingBag, IndianRupee, Clock, Package } from 'lucide-react';
import { formatPrice } from '../../utils/formatters';

const StatCard = ({ icon: Icon, label, value, color }) => (
  <div className="stat-card" style={{ borderLeftColor: color }}>
    <div className="stat-icon" style={{ color }}><Icon size={24} /></div>
    <div className="stat-info">
      <span className="stat-value">{value}</span>
      <span className="stat-label">{label}</span>
    </div>
  </div>
);

const DashboardStats = ({ stats }) => {
  return (
    <div className="dashboard-stats">
      <StatCard icon={ShoppingBag} label="Today's Orders" value={stats.todayOrders} color="#3b82f6" />
      <StatCard icon={IndianRupee} label="Today's Revenue" value={formatPrice(stats.todayRevenue)} color="#22c55e" />
      <StatCard icon={Clock} label="Pending Orders" value={stats.pendingOrders} color="#f59e0b" />
      <StatCard icon={Package} label="Active Products" value={stats.totalProducts} color="#8b5cf6" />
    </div>
  );
};

export default DashboardStats;
