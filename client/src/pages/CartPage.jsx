// Cart page — shows cart items, summary, and proceed to checkout
// Desktop: side-by-side layout (items left, summary right)

import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, Clock } from 'lucide-react';
import CartItem from '../components/cart/CartItem';
import CartSummary from '../components/cart/CartSummary';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';

const CartPage = () => {
  const { items, clearCart, itemCount } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  if (items.length === 0) {
    return (
      <div className="page-container">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
            <ArrowLeft size={20} />
          </button>
          <h2 className="page-title">Your Cart</h2>
        </div>
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
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="page-title">My Cart</h2>
      </div>

      {/* Delivery info strip */}
      <div className="cart-delivery-strip">
        <Clock size={16} />
        <div>
          <strong>Delivery in 15–30 mins</strong>
          <span>Shipment of {itemCount} item{itemCount > 1 ? 's' : ''}</span>
        </div>
      </div>

      <div className="cart-page-layout">
        {/* Left: cart items */}
        <div className="cart-page-left">
          <div className="cart-items">
            {items.map((item) => <CartItem key={item.product} item={item} />)}
          </div>
        </div>

        {/* Right: summary + actions (sticks on desktop) */}
        <div className="cart-page-right">
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
      </div>
    </div>
  );
};

export default CartPage;
