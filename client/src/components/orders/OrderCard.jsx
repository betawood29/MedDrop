// Order card — compact order summary with product thumbnails
// Handles both shop orders and print orders

import { useNavigate } from 'react-router-dom';
import { Printer, ChevronRight } from 'lucide-react';
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

  // Get up to 4 unique item images for thumbnail strip
  const itemImages = (order.items || [])
    .filter((item) => item.image)
    .slice(0, 4);

  const extraCount = (order.items || []).length - 4;

  return (
    <div className="order-card" onClick={handleClick}>
      <div className="order-card-header">
        <div className="order-card-id-row">
          <span className="order-id">
            {isPrint && <Printer size={14} style={{ marginRight: 4, verticalAlign: -2 }} />}
            #{order.orderId}
          </span>
          <span className="order-date">{formatDateTime(order.createdAt)}</span>
        </div>
        <span className="order-status-badge" style={{ background: statusInfo.color }}>
          {statusInfo.label}
        </span>
      </div>

      <div className="order-card-body">
        {/* Thumbnail strip */}
        {!isPrint && itemImages.length > 0 && (
          <div className="order-card-thumbs">
            {itemImages.map((item, i) => (
              <div key={i} className="order-thumb">
                <img src={item.image} alt={item.name} />
                {item.quantity > 1 && <span className="order-thumb-qty">x{item.quantity}</span>}
              </div>
            ))}
            {extraCount > 0 && (
              <div className="order-thumb order-thumb-more">+{extraCount}</div>
            )}
          </div>
        )}

        {/* Item names */}
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
              {(order.items || []).length > 3 && <span className="order-card-more">+{order.items.length - 3} more</span>}
            </>
          )}
        </div>
      </div>

      <div className="order-card-footer">
        <span className="order-total">{formatPrice(order.total)}</span>
        <span className="order-card-arrow"><ChevronRight size={18} /></span>
      </div>
    </div>
  );
};

export default OrderCard;
