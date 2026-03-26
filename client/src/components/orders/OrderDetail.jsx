// Order detail component — shows full order info, items, tracker, and delivery details

import OrderTracker from './OrderTracker';
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
        <h3>Items</h3>
        {(order.items || []).map((item, i) => (
          <div key={i} className="order-item-row">
            <div className="order-item-left">
              <span className="order-item-qty">{item.quantity}x</span>
              <span>{item.name}</span>
            </div>
            <span>{formatPrice(item.price * item.quantity)}</span>
          </div>
        ))}
      </div>

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
          <span>Method</span><span>{order.paymentMethod?.toUpperCase()}</span>
        </div>
        <div className="detail-row">
          <span>Status</span><span>{order.paymentStatus || '—'}</span>
        </div>
      </div>

      <div className="order-detail-section">
        <h3>Delivery</h3>
        <div className="detail-row"><span>Hostel</span><span>{order.hostel}</span></div>
        <div className="detail-row"><span>Gate</span><span>{order.gate}</span></div>
        {order.note && <div className="detail-row"><span>Note</span><span>{order.note}</span></div>}
      </div>
    </div>
  );
};

export default OrderDetail;
