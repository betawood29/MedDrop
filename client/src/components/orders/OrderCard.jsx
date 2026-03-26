// Order card — compact order summary for the orders list page

import { useNavigate } from 'react-router-dom';
import { formatPrice, formatDateTime } from '../../utils/formatters';
import { ORDER_STATUSES } from '../../utils/constants';

const OrderCard = ({ order }) => {
  const navigate = useNavigate();
  const statusInfo = ORDER_STATUSES[order.status] || {};

  return (
    <div className="order-card" onClick={() => navigate(`/orders/${order.orderId || order._id}`)}>
      <div className="order-card-header">
        <span className="order-id">#{order.orderId}</span>
        <span className="order-status" style={{ color: statusInfo.color }}>
          {statusInfo.label}
        </span>
      </div>

      <div className="order-card-items">
        {(order.items || []).slice(0, 3).map((item, i) => (
          <span key={i}>{item.name} x{item.quantity}</span>
        ))}
        {(order.items || []).length > 3 && <span>+{order.items.length - 3} more</span>}
      </div>

      <div className="order-card-footer">
        <span className="order-total">{formatPrice(order.total)}</span>
        <span className="order-date">{formatDateTime(order.createdAt)}</span>
      </div>
    </div>
  );
};

export default OrderCard;
