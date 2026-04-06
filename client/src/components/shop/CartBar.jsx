// Sticky bottom cart bar — red pill "View Cart" with item count and total

import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowRight } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../utils/formatters';

const CartBar = () => {
  const { itemCount, total, printOrder } = useCart();
  const navigate = useNavigate();
  const badgeCount = itemCount + (printOrder ? 1 : 0);

  if (badgeCount === 0) return null;

  return (
    <div className="cart-bar" onClick={() => navigate('/cart')}>
      <div className="cart-bar-left">
        <ShoppingBag size={18} />
        <span className="cart-bar-count">{badgeCount}</span>
        <span>View Cart</span>
      </div>
      <div className="cart-bar-right">
        <span>{formatPrice(total)}</span>
        <ArrowRight size={16} />
      </div>
    </div>
  );
};

export default CartBar;
