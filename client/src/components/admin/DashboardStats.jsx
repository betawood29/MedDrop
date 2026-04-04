// Dashboard stats cards — today's key metrics + inventory/users overview

import { ShoppingBag, IndianRupee, Clock, Package, Users, AlertTriangle, TrendingUp, CheckCircle, Printer } from 'lucide-react';
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
      <StatCard icon={ShoppingBag} label="Today's Orders" value={stats.todayOrders} color="#3b82f6" sub={`Shop: ${stats.todayShopOrders || 0} · Print: ${stats.todayPrintOrders || 0}`} />
      <StatCard icon={IndianRupee} label="Today's Revenue" value={formatPrice(stats.todayRevenue)} color="#22c55e" />
      <StatCard icon={Clock} label="Pending Orders" value={stats.pendingOrders} color="#f59e0b" />
      <StatCard icon={Printer} label="Print Orders (Range)" value={stats.rangePrintOrders || 0} color="#8b5cf6" sub={stats.rangePrintRevenue ? formatPrice(stats.rangePrintRevenue) : '₹0'} />
      <StatCard icon={Package} label="Active Products" value={stats.totalProducts} color="#7c3aed" />
      <StatCard icon={Users} label="Total Users" value={stats.totalUsers} color="#eab308" />
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
