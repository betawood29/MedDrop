// Cart summary — subtotal, delivery fee, total with free delivery indicator

import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../utils/formatters';
import { FREE_DELIVERY_MIN } from '../../utils/constants';

const CartSummary = () => {
  const { subtotal, deliveryFee, total } = useCart();
  const amountForFree = FREE_DELIVERY_MIN - subtotal;

  return (
    <div className="cart-summary">
      <h3>Order Summary</h3>

      {amountForFree > 0 && (
        <div className="free-delivery-hint">
          Add {formatPrice(amountForFree)} more for FREE delivery!
        </div>
      )}

      <div className="summary-row">
        <span>Subtotal</span>
        <span>{formatPrice(subtotal)}</span>
      </div>
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
