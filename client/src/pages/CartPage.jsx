// Cart page — shows cart items, summary, and proceed to checkout

import { useNavigate } from 'react-router-dom';
import { ShoppingBag } from 'lucide-react';
import CartItem from '../components/cart/CartItem';
import CartSummary from '../components/cart/CartSummary';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';

const CartPage = () => {
  const { items, clearCart } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="page-container">
        <div className="empty-state">
          <ShoppingBag size={48} />
          <h3>Your cart is empty</h3>
          <p>Add some items to get started</p>
          <button className="btn-primary" onClick={() => navigate('/')}>Browse Products</button>
        </div>
      </div>
    );
  }

  return (
    <div className="page-container">
      <h2 className="page-title">Your Cart</h2>

      <div className="cart-items">
        {items.map((item) => <CartItem key={item.product} item={item} />)}
      </div>

      <CartSummary />

      <div className="cart-actions">
        <button className="btn-secondary" onClick={clearCart}>Clear Cart</button>
        <button className="btn-primary" onClick={() => {
          if (!user) { navigate('/login'); return; }
          navigate('/checkout');
        }}>
          Proceed to Checkout
        </button>
      </div>
    </div>
  );
};

export default CartPage;
