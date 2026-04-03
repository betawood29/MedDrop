// Order card — compact order summary for the orders list page
// Handles both shop orders and print orders

import { useNavigate } from 'react-router-dom';
import { Printer } from 'lucide-react';
import { formatPrice, formatDateTime } from '../../utils/formatters';
import { ORDER_STATUSES, PRINT_ORDER_STATUSES } from '../../utils/constants';

const OrderCard = ({ order }) => {
  const navigate = useNavigate();
  const isPrint = order.orderType === 'print';
  const statuses = isPrint ? PRINT_ORDER_STATUSES : ORDER_STATUSES;
  const statusInfo = statuses[order.status] || {};

  const handleClick = () => {
    if (isPrint) {
      navigate(`/orders/print/${order.orderId || order._id}`);
    } else {
      navigate(`/orders/${order.orderId || order._id}`);
    }
  };

  return (
    <div className="order-card" onClick={handleClick}>
      <div className="order-card-header">
        <span className="order-id">
          {isPrint && <Printer size={14} style={{ marginRight: 4, verticalAlign: -2 }} />}
          #{order.orderId}
        </span>
        <span className="order-status" style={{ color: statusInfo.color }}>
          {statusInfo.label}
        </span>
      </div>

      <div className="order-card-items">
        {isPrint ? (
          <>
            <span>{order.totalPages} pages · {order.config?.copies || 1} copies</span>
            <span>{order.config?.colorMode === 'bw' ? 'B&W' : 'Color'} · {order.config?.sides === 'single' ? 'Single' : 'Double'}-sided</span>
            <span>{(order.files || []).length} file{(order.files || []).length !== 1 ? 's' : ''}</span>
          </>
        ) : (
          <>
            {(order.items || []).slice(0, 3).map((item, i) => (
              <span key={i}>{item.name} x{item.quantity}</span>
            ))}
            {(order.items || []).length > 3 && <span>+{order.items.length - 3} more</span>}
          </>
        )}
      </div>

      <div className="order-card-footer">
        <span className="order-total">{formatPrice(order.total)}</span>
        <span className="order-date">{formatDateTime(order.createdAt)}</span>
      </div>
    </div>
  );
};

export default OrderCard;
