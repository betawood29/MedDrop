// Cart item row — shows product name, price, quantity controls, and remove button

import { Plus, Minus, Trash2 } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../utils/formatters';

const CartItem = ({ item }) => {
  const { updateQty, removeItem } = useCart();

  return (
    <div className="cart-item">
      <div className="cart-item-image">
        {item.image ? (
          <img src={item.image} alt={item.name} />
        ) : (
          <div className="cart-item-placeholder">📦</div>
        )}
      </div>

      <div className="cart-item-info">
        <h4>{item.name}</h4>
        <p className="cart-item-price">{formatPrice(item.price)}</p>
      </div>

      <div className="cart-item-actions">
        <div className="qty-control">
          <button onClick={() => updateQty(item.product, item.quantity - 1)} aria-label="Decrease">
            <Minus size={14} />
          </button>
          <span>{item.quantity}</span>
          <button onClick={() => updateQty(item.product, item.quantity + 1)} aria-label="Increase">
            <Plus size={14} />
          </button>
        </div>
        <span className="cart-item-total">{formatPrice(item.price * item.quantity)}</span>
      </div>
    </div>
  );
};

export default CartItem;
