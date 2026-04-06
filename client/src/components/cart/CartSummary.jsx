// Cart summary — subtotal, print order, delivery fee, total

import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../utils/formatters';
import { FREE_DELIVERY_MIN } from '../../utils/constants';

const CartSummary = () => {
  const { subtotal, deliveryFee, printOrder } = useCart();

  const printTotal = printOrder ? printOrder.totalPrice : 0;
  const printDelivery = printOrder ? printOrder.deliveryFee : 0;
  const combinedSubtotal = subtotal + printTotal;
  const combinedDelivery = deliveryFee + printDelivery;
  const grandTotal = combinedSubtotal + combinedDelivery;

  const amountForFree = subtotal > 0 ? FREE_DELIVERY_MIN - subtotal : 0;

  return (
    <div className="cart-summary">
      <h3>Order Summary</h3>

      {amountForFree > 0 && (
        <div className="free-delivery-hint">
          Add {formatPrice(amountForFree)} more for FREE delivery on shop items!
        </div>
      )}

      {subtotal > 0 && (
        <div className="summary-row">
          <span>Shop Subtotal</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
      )}

      {printOrder && (
        <div className="summary-row">
          <span>Print Order</span>
          <span>{formatPrice(printTotal)}</span>
        </div>
      )}

      <div className="summary-row">
        <span>Delivery Fee</span>
        <span className={combinedDelivery === 0 ? 'text-green' : ''}>
          {combinedDelivery === 0 ? 'FREE' : formatPrice(combinedDelivery)}
        </span>
      </div>

      <div className="summary-row summary-total">
        <span>Total</span>
        <span>{formatPrice(grandTotal)}</span>
      </div>
    </div>
  );
};

export default CartSummary;
