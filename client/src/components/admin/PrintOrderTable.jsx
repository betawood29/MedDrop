// Admin print order table — shows print orders with status update dropdown

import { useState } from 'react';
import { formatPrice, formatDateTime } from '../../utils/formatters';
import { PRINT_ORDER_STATUSES } from '../../utils/constants';

const statusOptions = ['placed', 'printing', 'ready', 'out', 'delivered', 'cancelled'];

const PrintOrderTable = ({ orders, onStatusChange, loading }) => {
  const [expandedId, setExpandedId] = useState(null);

  if (!orders.length) {
    return <div className="empty-state"><p>No print orders found</p></div>;
  }

  return (
    <div className="order-table">
      <div className="table-header">
        <span>Order ID</span>
        <span>Customer</span>
        <span>Details</span>
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
            <span>{order.totalPages}pg x {order.config?.copies || 1} · {order.config?.colorMode === 'bw' ? 'B&W' : 'Color'}</span>
            <span>{formatPrice(order.total)}</span>
            <span>{order.gate}</span>
            <span>
              <select
                value={order.status}
                onChange={(e) => { e.stopPropagation(); onStatusChange(order._id, e.target.value); }}
                className="status-select"
                style={{ color: PRINT_ORDER_STATUSES[order.status]?.color }}
                disabled={loading}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{PRINT_ORDER_STATUSES[s].label}</option>
                ))}
              </select>
            </span>
            <span>{formatDateTime(order.createdAt)}</span>
          </div>
          {expandedId === order._id && (
            <div className="table-row-detail">
              <div className="detail-items">
                <div><strong>Mode:</strong> {order.config?.colorMode === 'bw' ? 'Black & White' : 'Color'}, {order.config?.sides === 'double' ? 'Double-sided' : 'Single-sided'}</div>
                <div><strong>Paper:</strong> {order.config?.paperSize || 'A4'}</div>
                <div><strong>Files:</strong> {(order.files || []).map((f) => f.originalName).join(', ')}</div>
              </div>
              <div className="detail-meta">
                <span>Hostel: {order.hostel}</span>
                <span>Payment: {(order.paymentMethod || 'cod').toUpperCase()}</span>
                {order.note && <span>Note: {order.note}</span>}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PrintOrderTable;
