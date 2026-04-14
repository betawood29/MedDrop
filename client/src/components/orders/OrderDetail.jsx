// Order detail component — shows full order info with item images, tracker, and delivery details

import OrderTracker from './OrderTracker';
import DeliveryReview from './DeliveryReview';
import { formatPrice, formatDateTime } from '../../utils/formatters';

const OrderDetail = ({ order }) => {
  return (
    <div className="order-detail">
      <div className="order-detail-header">
        <h2>Order #{order.orderId}</h2>
        <span className="order-date">{formatDateTime(order.createdAt)}</span>
      </div>

      <OrderTracker status={order.status} />

      <div className="order-detail-section">
        <h3>Items ({(order.items || []).length})</h3>
        <div className="order-items-list">
          {(order.items || []).map((item, i) => (
            <div key={i} className="order-item-card">
              {item.image && (
                <div className="order-item-img">
                  <img src={item.image} alt={item.name} />
                </div>
              )}
              <div className="order-item-info">
                <span className="order-item-name">{item.name}</span>
                <span className="order-item-meta">{item.quantity} x {formatPrice(item.price)}</span>
              </div>
              <span className="order-item-total">{formatPrice(item.price * item.quantity)}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="order-detail-grid">
        <div className="order-detail-section">
          <h3>Payment</h3>
          <div className="detail-row">
            <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="detail-row">
            <span>Delivery</span>
            <span>{order.deliveryFee === 0 ? 'FREE' : formatPrice(order.deliveryFee)}</span>
          </div>
          <div className="detail-row total">
            <span>Total</span><span>{formatPrice(order.total)}</span>
          </div>
          <div className="detail-row">
            <span>Method</span>
            <span className="detail-badge">{order.paymentMethod?.toUpperCase()}</span>
          </div>
          <div className="detail-row">
            <span>Status</span>
            <span className="detail-badge">{order.paymentStatus || '—'}</span>
          </div>
        </div>

        <div className="order-detail-section">
          <h3>Delivery</h3>
          <div className="detail-row"><span>Hostel</span><span>{order.hostel}</span></div>
          <div className="detail-row"><span>Gate</span><span>{order.gate}</span></div>
          {order.note && <div className="detail-row"><span>Note</span><span>{order.note}</span></div>}
        </div>
      </div>

      {order.status === 'delivered' && (
        <DeliveryReview orderId={order.orderId} />
      )}
    </div>
  );
};

export default OrderDetail;
