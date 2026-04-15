// Cart page — shows shop items + print order, summary, and proceed to checkout
// Desktop: side-by-side layout (items left, summary right)

import { useNavigate } from 'react-router-dom';
import { ShoppingBag, ArrowLeft, CalendarClock, Printer, X, ShieldCheck, Upload, CheckCircle } from 'lucide-react';
import CartItem from '../components/cart/CartItem';
import CartSummary from '../components/cart/CartSummary';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { formatPrice } from '../utils/formatters';
import { getDeliveryInfo, DELIVERY_CUTOFF_HOUR } from '../utils/constants';

const CartPage = () => {
  const { items, clearCart, itemCount, printOrder, clearPrintOrder, hasAnything } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const rxItems = items.filter((i) => i.requiresPrescription);
  const hasRxItems = rxItems.length > 0;

  if (!hasAnything) {
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

  const totalCount = itemCount + (printOrder ? 1 : 0);

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="page-title">My Cart</h2>
      </div>

      {/* Prescription required notice */}
      {hasRxItems && user && (
        <div className="cart-rx-notice">
          <div className="cart-rx-notice-top">
            <ShieldCheck size={18} className="cart-rx-icon" />
            <div className="cart-rx-notice-text">
              <strong>Prescription required for {rxItems.length} item{rxItems.length > 1 ? 's' : ''}</strong>
              <span>Upload one prescription for all Rx medicines in your cart</span>
            </div>
          </div>
          <div className="cart-rx-medicines">
            {rxItems.map((i) => (
              <span key={i.product} className="cart-rx-pill">
                <CheckCircle size={11} /> {i.name}
              </span>
            ))}
          </div>
          <button className="cart-rx-upload-btn" onClick={() => navigate('/prescription')}>
            <Upload size={15} /> Upload Prescription
          </button>
        </div>
      )}

      {/* Delivery info strip */}
      <div className="cart-delivery-strip">
        <CalendarClock size={16} />
        <div>
          <strong>Delivery {getDeliveryInfo().label}</strong>
          <span>{totalCount} item{totalCount > 1 ? 's' : ''} · Order before {DELIVERY_CUTOFF_HOUR > 12 ? DELIVERY_CUTOFF_HOUR - 12 : DELIVERY_CUTOFF_HOUR} PM for same-day delivery</span>
        </div>
      </div>

      <div className="cart-page-layout">
        {/* Left: cart items */}
        <div className="cart-page-left">
          {/* Shop items */}
          {items.length > 0 && (
            <div className="cart-items">
              {items.map((item) => <CartItem key={item.product} item={item} />)}
            </div>
          )}

          {/* Print order card */}
          {printOrder && (
            <div className="print-cart-card">
              <div className="print-cart-header">
                <div className="print-cart-title">
                  <Printer size={18} />
                  <strong>Print Order</strong>
                </div>
                <button className="print-cart-remove" onClick={clearPrintOrder} aria-label="Remove print order">
                  <X size={16} />
                </button>
              </div>
              <div className="print-cart-details">
                <span>{printOrder.fileItems.length} file{printOrder.fileItems.length !== 1 ? 's' : ''}</span>
                <span>{printOrder.totalPages} pages</span>
              </div>

              {/* Show re-upload warning if files were lost on refresh */}
              {printOrder.filesLost && (
                <div className="print-cart-warning">
                  Files were lost on page refresh. Please re-add from Print Store.
                </div>
              )}

              <div className="print-cart-files">
                {printOrder.fileItems.map((f, i) => (
                  <div key={i} className="print-cart-file">
                    <span className="print-cart-file-name">{f.name || f.file?.name}</span>
                    <span className="print-cart-file-config">
                      {f.pages}pg x {f.copies} · {f.colorMode === 'bw' ? 'B&W' : 'Color'} · {f.sides === 'double' ? '2-sided' : '1-sided'}
                    </span>
                  </div>
                ))}
              </div>
              <div className="print-cart-footer">
                <span className="print-cart-price">{formatPrice(printOrder.totalPrice)}</span>
                <button className="print-cart-edit" onClick={() => navigate('/print-store')}>Edit</button>
              </div>
            </div>
          )}
        </div>

        {/* Right: summary + actions (sticks on desktop) */}
        <div className="cart-page-right">
          <CartSummary />
          <div className="cart-actions">
            {items.length > 0 && (
              <button className="btn-secondary" onClick={clearCart}>Clear Cart</button>
            )}
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
