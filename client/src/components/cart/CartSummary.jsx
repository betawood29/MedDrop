// Cart summary — combined subtotal, delivery fee based on total order value

import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../utils/formatters';
import { FREE_DELIVERY_MIN } from '../../utils/constants';

const CartSummary = () => {
  const { subtotal, printSubtotal, deliveryFee, total } = useCart();

  const combinedSubtotal = subtotal + printSubtotal;
  const amountForFree = combinedSubtotal > 0 && combinedSubtotal < FREE_DELIVERY_MIN
    ? FREE_DELIVERY_MIN - combinedSubtotal
    : 0;

  return (
    <div className="cart-summary">
      <h3>Order Summary</h3>

      {amountForFree > 0 && (
        <div className="free-delivery-hint">
          Add {formatPrice(amountForFree)} more for FREE delivery!
        </div>
      )}

      {subtotal > 0 && (
        <div className="summary-row">
          <span>Shop Items</span>
          <span>{formatPrice(subtotal)}</span>
        </div>
      )}

      {printSubtotal > 0 && (
        <div className="summary-row">
          <span>Print Order</span>
          <span>{formatPrice(printSubtotal)}</span>
        </div>
      )}

      <div className="summary-row">
        <span>Delivery Fee</span>
        <span className={deliveryFee === 0 ? 'text-green' : ''}>
          {deliveryFee === 0 ? 'FREE' : formatPrice(deliveryFee)}
        </span>
      </div>

      <div className="summary-row summary-total">
        <span>Total</span>
        <span>{formatPrice(total)}</span>
      </div>
    </div>
  );
};

export default CartSummary;
