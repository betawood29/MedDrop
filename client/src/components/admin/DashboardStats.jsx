// Dashboard stats cards — today's key metrics + inventory/users overview

import { ShoppingBag, IndianRupee, Clock, Package, Users, AlertTriangle, TrendingUp, CheckCircle } from 'lucide-react';
import { formatPrice } from '../../utils/formatters';

const StatCard = ({ icon: Icon, label, value, color, sub }) => (
  <div className="db-stat-card">
    <div className="db-stat-icon" style={{ background: `${color}15`, color }}><Icon size={22} /></div>
    <div className="db-stat-info">
      <span className="db-stat-value">{value}</span>
      <span className="db-stat-label">{label}</span>
      {sub && <span className="db-stat-sub">{sub}</span>}
    </div>
  </div>
);

const DashboardStats = ({ stats }) => {
  return (
    <div className="db-stats-grid">
      <StatCard icon={ShoppingBag} label="Today's Orders" value={stats.todayOrders} color="#3b82f6" />
      <StatCard icon={IndianRupee} label="Today's Revenue" value={formatPrice(stats.todayRevenue)} color="#22c55e" />
      <StatCard icon={Clock} label="Pending Orders" value={stats.pendingOrders} color="#f59e0b" />
      <StatCard icon={Package} label="Active Products" value={stats.totalProducts} color="#8b5cf6" />
      <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="#06b6d4" />
      <StatCard
        icon={AlertTriangle}
        label="Out of Stock"
        value={stats.outOfStockProducts}
        color="#ef4444"
      />
      <StatCard icon={TrendingUp} label="Avg Order Value" value={formatPrice(stats.avgOrderValue)} color="#10b981" />
      <StatCard icon={CheckCircle} label="Delivered (Range)" value={stats.rangeDeliveredOrders} color="#22c55e" />
    </div>
  );
};

export default DashboardStats;
