// Admin dashboard — rich stats, date range filters, trends, top products

import { useState, useEffect, useMemo } from 'react';
import toast from 'react-hot-toast';
import DashboardStats from '../../components/admin/DashboardStats';
import Loader from '../../components/common/Loader';
import { getDashboard, getAdminOrders, updateOrderStatus, getAdminPrintOrders, updatePrintOrderStatus } from '../../services/adminService';
import { useAdminSocket } from '../../hooks/useSocket';
import { formatPrice, timeAgo, formatDate } from '../../utils/formatters';
import { ORDER_STATUSES, PRINT_ORDER_STATUSES } from '../../utils/constants';
import {
  ShoppingBag, IndianRupee, Clock, Package, Users, TrendingUp,
  AlertTriangle, CheckCircle, XCircle, BarChart3, Star, Zap,
} from 'lucide-react';

const RANGE_OPTIONS = [
  { value: '7d', label: 'Last 7 Days' },
  { value: '15d', label: 'Last 15 Days' },
  { value: '30d', label: 'Last 30 Days' },
  { value: 'custom', label: 'Custom Range' },
];

const AdminDashboard = () => {
  const [stats, setStats] = useState(null);
  const [recentOrders, setRecentOrders] = useState([]);
  const [recentPrintOrders, setRecentPrintOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [range, setRange] = useState('7d');
  const [customFrom, setCustomFrom] = useState('');
  const [customTo, setCustomTo] = useState('');

  const rangeParams = useMemo(() => {
    if (range === 'custom' && customFrom && customTo) {
      return { range: 'custom', from: customFrom, to: customTo };
    }
    return { range };
  }, [range, customFrom, customTo]);

  const fetchData = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const [statsRes, ordersRes, printOrdersRes] = await Promise.all([
        getDashboard(rangeParams),
        getAdminOrders({ date: 'today', limit: 10 }),
        getAdminPrintOrders({ date: 'today' }).catch(() => ({ data: { data: [] } })),
      ]);
      setStats(statsRes.data.data);
      setRecentOrders(ordersRes.data.data);
      setRecentPrintOrders(printOrdersRes.data.data || []);
    } catch (err) {
      toast.error('Failed to load dashboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchData(true); }, [rangeParams]);

  // Live updates
  useAdminSocket(
    (order) => {
      toast(`New order #${order.orderId}!`, { icon: '🔔' });
      fetchData();
    },
    () => fetchData()
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

  const handlePrintStatusChange = async (orderId, status) => {
    try {
      await updatePrintOrderStatus(orderId, status);
      toast.success(`Print order updated to ${PRINT_ORDER_STATUSES[status].label}`);
      fetchData();
    } catch (err) {
      toast.error('Failed to update print order');
    }
  };

  // Calculate max for bar chart scaling
  const maxOrders = stats?.dailyTrend?.length
    ? Math.max(...stats.dailyTrend.map((d) => d.orders), 1)
    : 1;
  const maxRevenue = stats?.dailyTrend?.length
    ? Math.max(...stats.dailyTrend.map((d) => d.revenue), 1)
    : 1;

  if (loading) return <Loader text="Loading dashboard..." />;

  return (
    <div className="admin-page db-page">
      {/* Header with date range */}
      <div className="db-header">
        <div>
          <h2 className="db-title">Dashboard</h2>
          <p className="db-subtitle">Overview of your store performance</p>
        </div>
        <div className="db-range-controls">
          <div className="db-range-tabs">
            {RANGE_OPTIONS.map((opt) => (
              <button
                key={opt.value}
                className={`db-range-tab ${range === opt.value ? 'active' : ''}`}
                onClick={() => setRange(opt.value)}
              >
                {opt.label}
              </button>
            ))}
          </div>
          {range === 'custom' && (
            <div className="db-custom-range">
              <input type="date" value={customFrom} onChange={(e) => setCustomFrom(e.target.value)} />
              <span>to</span>
              <input type="date" value={customTo} onChange={(e) => setCustomTo(e.target.value)} />
            </div>
          )}
        </div>
      </div>

      {stats && (
        <>
          {/* Today's highlight strip */}
          <div className="db-today-strip">
            <div className="db-today-item">
              <ShoppingBag size={18} />
              <span><strong>{stats.todayOrders}</strong> orders today</span>
            </div>
            <div className="db-today-item">
              <IndianRupee size={18} />
              <span><strong>{formatPrice(stats.todayRevenue)}</strong> revenue today</span>
            </div>
            <div className="db-today-item">
              <Clock size={18} />
              <span><strong>{stats.pendingOrders}</strong> pending</span>
            </div>
          </div>

          {/* Main stat cards */}
          <DashboardStats stats={stats} />

          {/* Charts row */}
          <div className="db-charts-row">
            {/* Orders trend bar chart */}
            <div className="db-chart-card">
              <h3 className="db-card-title"><BarChart3 size={18} /> Orders Trend</h3>
              <div className="db-bar-chart">
                {stats.dailyTrend.map((day) => {
                  const pct = (day.orders / maxOrders) * 100;
                  const dateLabel = new Date(day._id).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                  return (
                    <div key={day._id} className="db-bar-col" title={`${dateLabel}: ${day.orders} orders`}>
                      <span className="db-bar-value">{day.orders}</span>
                      <div className="db-bar" style={{ height: `${Math.max(pct, 4)}%` }} />
                      <span className="db-bar-label">{dateLabel}</span>
                    </div>
                  );
                })}
                {stats.dailyTrend.length === 0 && <p className="text-muted" style={{margin:'auto'}}>No data for this range</p>}
              </div>
            </div>

            {/* Revenue trend */}
            <div className="db-chart-card">
              <h3 className="db-card-title"><TrendingUp size={18} /> Revenue Trend</h3>
              <div className="db-bar-chart">
                {stats.dailyTrend.map((day) => {
                  const pct = (day.revenue / maxRevenue) * 100;
                  const dateLabel = new Date(day._id).toLocaleDateString('en-IN', { day: '2-digit', month: 'short' });
                  return (
                    <div key={day._id} className="db-bar-col revenue" title={`${dateLabel}: ${formatPrice(day.revenue)}`}>
                      <span className="db-bar-value">{formatPrice(day.revenue)}</span>
                      <div className="db-bar" style={{ height: `${Math.max(pct, 4)}%` }} />
                      <span className="db-bar-label">{dateLabel}</span>
                    </div>
                  );
                })}
                {stats.dailyTrend.length === 0 && <p className="text-muted" style={{margin:'auto'}}>No data for this range</p>}
              </div>
            </div>
          </div>

          {/* Bottom grid: top products, order status, payment, peak hours */}
          <div className="db-bottom-grid">
            {/* Top products */}
            <div className="db-card">
              <h3 className="db-card-title"><Star size={18} /> Top Selling Products</h3>
              {stats.topProducts.length === 0 ? (
                <p className="text-muted">No sales data in this range</p>
              ) : (
                <div className="db-top-products">
                  {stats.topProducts.map((p, i) => (
                    <div key={p._id} className="db-top-product">
                      <span className="db-tp-rank">#{i + 1}</span>
                      {p.image ? (
                        <img src={p.image} alt={p.name} className="db-tp-img" />
                      ) : (
                        <div className="db-tp-img-placeholder"><Package size={20} /></div>
                      )}
                      <div className="db-tp-info">
                        <span className="db-tp-name">{p.name}</span>
                        <span className="db-tp-meta">{p.totalQty} sold &middot; {formatPrice(p.totalRevenue)}</span>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Order status breakdown */}
            <div className="db-card">
              <h3 className="db-card-title"><BarChart3 size={18} /> Order Status</h3>
              <div className="db-status-breakdown">
                {Object.entries(ORDER_STATUSES).map(([key, val]) => {
                  const count = stats.statusBreakdown[key] || 0;
                  const pct = stats.rangeOrders > 0 ? ((count / stats.rangeOrders) * 100).toFixed(1) : 0;
                  return (
                    <div key={key} className="db-status-row">
                      <div className="db-status-label">
                        <span className="db-status-dot" style={{ background: val.color }} />
                        {val.label}
                      </div>
                      <div className="db-status-bar-wrap">
                        <div className="db-status-bar" style={{ width: `${pct}%`, background: val.color }} />
                      </div>
                      <span className="db-status-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Payment breakdown */}
            <div className="db-card">
              <h3 className="db-card-title"><IndianRupee size={18} /> Payment Methods</h3>
              <div className="db-payment-grid">
                {Object.entries(stats.paymentBreakdown).map(([method, data]) => (
                  <div key={method} className="db-payment-card">
                    <span className="db-payment-method">{method === 'upi' ? 'UPI' : method === 'cod' ? 'COD' : method}</span>
                    <span className="db-payment-revenue">{formatPrice(data.revenue)}</span>
                    <span className="db-payment-orders">{data.orders} orders</span>
                  </div>
                ))}
                {Object.keys(stats.paymentBreakdown).length === 0 && (
                  <p className="text-muted">No payment data</p>
                )}
              </div>

              <h3 className="db-card-title" style={{ marginTop: 20 }}><Zap size={18} /> Peak Hours</h3>
              <div className="db-peak-hours">
                {stats.peakHours.map((h) => {
                  const hour = h.hour;
                  const label = hour === 0 ? '12 AM' : hour < 12 ? `${hour} AM` : hour === 12 ? '12 PM' : `${hour - 12} PM`;
                  return (
                    <div key={hour} className="db-peak-chip">
                      <span className="db-peak-time">{label}</span>
                      <span className="db-peak-count">{h.orders}</span>
                    </div>
                  );
                })}
                {stats.peakHours.length === 0 && <p className="text-muted">No data</p>}
              </div>
            </div>
          </div>

          {/* Range summary strip */}
          <div className="db-range-summary">
            <div className="db-rs-item">
              <span className="db-rs-label">Total Orders</span>
              <span className="db-rs-value">{stats.rangeOrders}</span>
            </div>
            <div className="db-rs-item">
              <span className="db-rs-label">Revenue</span>
              <span className="db-rs-value">{formatPrice(stats.rangeRevenue)}</span>
            </div>
            <div className="db-rs-item">
              <span className="db-rs-label">Avg Order Value</span>
              <span className="db-rs-value">{formatPrice(stats.avgOrderValue)}</span>
            </div>
            <div className="db-rs-item">
              <span className="db-rs-label">Delivered</span>
              <span className="db-rs-value green">{stats.rangeDeliveredOrders}</span>
            </div>
            <div className="db-rs-item">
              <span className="db-rs-label">Cancelled</span>
              <span className="db-rs-value red">{stats.rangeCancelledOrders}</span>
            </div>
          </div>

          {/* Recent shop orders */}
          <div className="db-card" style={{ marginTop: 20 }}>
            <h3 className="db-card-title"><ShoppingBag size={18} /> Recent Shop Orders (Today)</h3>
            {recentOrders.length === 0 ? (
              <p className="text-muted">No shop orders today</p>
            ) : (
              <div className="db-recent-orders">
                {recentOrders.map((order) => (
                  <div key={order._id} className="db-order-row">
                    <span className="db-order-id">#{order.orderId}</span>
                    <span className="db-order-customer">{order.user?.name}</span>
                    <span className="db-order-items">{order.items.length} items</span>
                    <span className="db-order-total">{formatPrice(order.total)}</span>
                    <span className="db-order-gate">{order.gate}</span>
                    <span className="db-order-time">{timeAgo(order.createdAt)}</span>
                    <select
                      value={order.status}
                      onChange={(e) => handleStatusChange(order._id, e.target.value)}
                      className="db-order-status"
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

          {/* Recent print orders */}
          <div className="db-card" style={{ marginTop: 20 }}>
            <h3 className="db-card-title"><Package size={18} /> Recent Print Orders (Today)</h3>
            {recentPrintOrders.length === 0 ? (
              <p className="text-muted">No print orders today</p>
            ) : (
              <div className="db-recent-orders">
                {recentPrintOrders.map((order) => (
                  <div key={order._id} className="db-order-row">
                    <span className="db-order-id">#{order.orderId}</span>
                    <span className="db-order-customer">{order.user?.name}</span>
                    <span className="db-order-items">{order.totalPages}pg x{order.config?.copies || 1}</span>
                    <span className="db-order-total">{formatPrice(order.total)}</span>
                    <span className="db-order-gate">{order.gate}</span>
                    <span className="db-order-time">{timeAgo(order.createdAt)}</span>
                    <select
                      value={order.status}
                      onChange={(e) => handlePrintStatusChange(order._id, e.target.value)}
                      className="db-order-status"
                      style={{ color: PRINT_ORDER_STATUSES[order.status]?.color }}
                    >
                      {Object.entries(PRINT_ORDER_STATUSES).map(([key, val]) => (
                        <option key={key} value={key}>{val.label}</option>
                      ))}
                    </select>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default AdminDashboard;
