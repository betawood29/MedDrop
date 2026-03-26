// Admin order table — shows orders with status update dropdown

import { useState } from 'react';
import { formatPrice, formatDateTime } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';

const statusOptions = ['placed', 'confirmed', 'packed', 'out', 'gate', 'delivered', 'cancelled'];

const OrderTable = ({ orders, onStatusChange, loading }) => {
  const [expandedId, setExpandedId] = useState(null);

  if (!orders.length) {
    return <div className="empty-state"><p>No orders found</p></div>;
  }

  return (
    <div className="order-table">
      <div className="table-header">
        <span>Order ID</span>
        <span>Customer</span>
        <span>Items</span>
        <span>Total</span>
        <span>Gate</span>
        <span>Status</span>
        <span>Time</span>
      </div>
      {orders.map((order) => (
        <div key={order._id} className="table-row-wrap">
          <div className="table-row" onClick={() => setExpandedId(expandedId === order._id ? null : order._id)}>
            <span className="order-id-cell">#{order.orderId}</span>
            <span>{order.user?.name || 'N/A'}<br /><small>{order.user?.phone}</small></span>
            <span>{order.items.length} items</span>
            <span>{formatPrice(order.total)}</span>
            <span>{order.gate}</span>
            <span>
              <select
                value={order.status}
                onChange={(e) => { e.stopPropagation(); onStatusChange(order._id, e.target.value); }}
                className="status-select"
                style={{ color: ORDER_STATUSES[order.status]?.color }}
                disabled={loading}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{ORDER_STATUSES[s].label}</option>
                ))}
              </select>
            </span>
            <span>{formatDateTime(order.createdAt)}</span>
          </div>
          {expandedId === order._id && (
            <div className="table-row-detail">
              <div className="detail-items">
                {order.items.map((item, i) => (
                  <div key={i}>{item.quantity}x {item.name} — {formatPrice(item.price * item.quantity)}</div>
                ))}
              </div>
              <div className="detail-meta">
                <span>Hostel: {order.hostel}</span>
                <span>Payment: {order.paymentMethod?.toUpperCase()} ({order.paymentStatus})</span>
                {order.note && <span>Note: {order.note}</span>}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default OrderTable;
