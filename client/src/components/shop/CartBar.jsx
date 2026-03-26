// Sticky bottom cart bar — shows item count and total, tap to go to cart

import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../utils/formatters';

const CartBar = () => {
  const { itemCount, total } = useCart();
  const navigate = useNavigate();

  if (itemCount === 0) return null;

  return (
    <div className="cart-bar" onClick={() => navigate('/cart')}>
      <div className="cart-bar-left">
        <ShoppingBag size={20} />
        <span>{itemCount} item{itemCount > 1 ? 's' : ''}</span>
      </div>
      <div className="cart-bar-right">
        <span>{formatPrice(total)}</span>
        <span className="cart-bar-arrow">→</span>
      </div>
    </div>
  );
};

export default CartBar;
