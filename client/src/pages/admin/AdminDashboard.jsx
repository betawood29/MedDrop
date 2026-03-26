// Admin dashboard — stats overview and recent orders

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import DashboardStats from '../../components/admin/DashboardStats';
import Loader from '../../components/common/Loader';
import { getDashboard, getAdminOrders, updateOrderStatus } from '../../services/adminService';
import { useAdminSocket } from '../../hooks/useSocket';
import { formatPrice, timeAgo } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchData = async () => {
    try {
      const [statsRes, ordersRes] = await Promise.all([
        getDashboard(),
        getAdminOrders({ date: 'today', limit: 10 }),
      ]);
      setStats(statsRes.data.data);
      setRecentOrders(ordersRes.data.data);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(); }, []);

  // Live new order notification + product stock updates (when users purchase)
  useAdminSocket(
    (order) => {
      toast(`New order #${order.orderId}!`, { icon: '🔔' });
      fetchData();
    },
    (product) => {
      // Stock changed (from user purchase or admin toggle) — refresh dashboard stats
      fetchData();
    }
  );

  const handleStatusChange = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      toast.success(`Order updated to ${ORDER_STATUSES[status].label}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update order');
    }
  };

  if (loading) return <Loader text="Loading dashboard..." />;

  return (
    <div className="admin-page">
      <h2>Dashboard</h2>
      {stats && <DashboardStats stats={stats} />}

      <h3 style={{ marginTop: 24 }}>Recent Orders (Today)</h3>
      {recentOrders.length === 0 ? (
        <p className="text-muted">No orders today</p>
      ) : (
        <div className="recent-orders">
          {recentOrders.map((order) => (
            <div key={order._id} className="recent-order-card">
              <div className="recent-order-top">
                <span className="order-id">#{order.orderId}</span>
                <span className="order-time">{timeAgo(order.createdAt)}</span>
              </div>
              <div className="recent-order-mid">
                <span>{order.user?.name} — {order.items.length} items — {formatPrice(order.total)}</span>
                <span className="order-gate">{order.gate}</span>
              </div>
              <select
                value={order.status}
                onChange={(e) => handleStatusChange(order._id, e.target.value)}
                className="status-select"
                style={{ color: ORDER_STATUSES[order.status]?.color }}
              >
                {Object.entries(ORDER_STATUSES).map(([key, val]) => (
                  <option key={key} value={key}>{val.label}</option>
                ))}
              </select>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
