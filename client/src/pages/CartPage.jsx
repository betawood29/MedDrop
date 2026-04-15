// Cart page — shows shop items + print order, summary, and proceed to checkout
// Rx items gate: blocks checkout when prescription status is none/pending/rejected/clarification_required

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingBag, ArrowLeft, CalendarClock, Printer, X,
  ShieldCheck, Upload, CheckCircle, Clock, AlertTriangle, MessageSquare,
} from 'lucide-react';
import CartItem from '../components/cart/CartItem';
import CartSummary from '../components/cart/CartSummary';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { formatPrice } from '../utils/formatters';
import { getDeliveryInfo, DELIVERY_CUTOFF_HOUR, RX_BLOCKING_STATUSES } from '../utils/constants';
import { getMyPrescriptions } from '../services/prescriptionService';

// ── per-status display config ────────────────────────────────────────────────
const RX_NOTICE = {
  approved: {
    icon: CheckCircle,
    iconClass: 'cart-rx-icon-approved',
    className: 'rx-status-approved',
    title: 'Prescription Verified',
    body: 'Your prescription is approved — you can proceed to checkout.',
    showUpload: false,
  },
  partially_approved: {
    icon: CheckCircle,
    iconClass: 'cart-rx-icon-approved',
    className: 'rx-status-approved',
    title: 'Prescription Partially Approved',
    body: 'Some medicines are approved. Only approved items can be ordered.',
    showUpload: false,
  },
  pending: {
    icon: Clock,
    iconClass: 'cart-rx-icon-pending',
    className: 'rx-status-pending',
    title: 'Prescription Under Review',
    body: 'Checkout is blocked until our pharmacist approves your prescription.',
    showUpload: false,
  },
  clarification_required: {
    icon: MessageSquare,
    iconClass: 'cart-rx-icon-clarify',
    className: 'rx-status-clarify',
    title: 'Clarification Needed',
    body: 'Our pharmacist needs more information. Check the Prescription page to respond.',
    showUpload: false,
  },
  rejected: {
    icon: AlertTriangle,
    iconClass: 'cart-rx-icon-rejected',
    className: 'rx-status-rejected',
    title: 'Prescription Rejected',
    body: 'Your prescription was rejected. Please upload a new one to proceed.',
    showUpload: true,
  },
  none: {
    icon: ShieldCheck,
    iconClass: '',
    className: '',
    title: (rxCount) => `Prescription required for ${rxCount} item${rxCount !== 1 ? 's' : ''}`,
    body: 'Upload a valid prescription to proceed with checkout for Rx medicines.',
    showUpload: true,
  },
};

const CartPage = () => {
  const { items, clearCart, itemCount, printOrder, clearPrintOrder, hasAnything } = useCart();
  const { user } = useAuth();
  const navigate = useNavigate();

  const rxItems   = items.filter((i) => i.requiresPrescription);
  const hasRxItems = rxItems.length > 0;

  // null = loading, 'approved' | 'partially_approved' | 'pending' | 'rejected' | 'clarification_required' | 'none'
  const [rxStatus, setRxStatus] = useState(null);

  useEffect(() => {
    if (!hasRxItems || !user) { setRxStatus(null); return; }
    const thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
    getMyPrescriptions()
      .then((res) => {
        const prescriptions = res.data.data || [];
        const latestValid = prescriptions.find(
          (p) =>
            ['approved', 'partially_approved'].includes(p.status) &&
            !p.order &&
            !p.deliveryRequest?.hostel &&
            new Date(p.createdAt).getTime() > thirtyDaysAgo
        );
        if (latestValid) { setRxStatus(latestValid.status); return; }
        // No valid one — return the latest status for messaging
        const latest = prescriptions[0];
        if (!latest) { setRxStatus('none'); return; }
        setRxStatus(
          ['pending', 'rejected', 'clarification_required'].includes(latest.status)
            ? latest.status
            : 'none'
        );
      })
      .catch(() => setRxStatus('none'));
  }, [hasRxItems, user]);

  if (!hasAnything) {
    return (
      <div className="page-container">
        <div className="page-header">
          <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={20} /></button>
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

  const totalCount     = itemCount + (printOrder ? 1 : 0);
  const checkoutBlocked = hasRxItems && user && RX_BLOCKING_STATUSES.has(rxStatus ?? 'none');
  const notice         = rxStatus ? RX_NOTICE[rxStatus] : RX_NOTICE.none;
  const IconComp       = notice?.icon;

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back"><ArrowLeft size={20} /></button>
        <h2 className="page-title">My Cart</h2>
      </div>

      {/* Prescription status notice */}
      {hasRxItems && user && (
        <div className={`cart-rx-notice${notice?.className ? ' ' + notice.className : ''}`}>
          <div className="cart-rx-notice-top">
            {IconComp && <IconComp size={18} className={`cart-rx-icon ${notice.iconClass}`} />}
            <div className="cart-rx-notice-text">
              <strong>
                {typeof notice.title === 'function' ? notice.title(rxItems.length) : notice.title}
              </strong>
              <span>{notice.body}</span>
            </div>
          </div>
          <div className="cart-rx-medicines">
            {rxItems.map((i) => (
              <span key={i.product} className="cart-rx-pill">{i.name}</span>
            ))}
          </div>
          {notice?.showUpload && (
            <button className="cart-rx-upload-btn" onClick={() => navigate('/prescription')}>
              <Upload size={15} /> Upload Prescription
            </button>
          )}
          {rxStatus === 'clarification_required' && (
            <button className="cart-rx-upload-btn" style={{ background: '#7c3aed' }} onClick={() => navigate('/prescription')}>
              <MessageSquare size={15} /> View Clarification
            </button>
          )}
        </div>
      )}

      {/* Delivery info */}
      <div className="cart-delivery-strip">
        <CalendarClock size={16} />
        <div>
          <strong>Delivery {getDeliveryInfo().label}</strong>
          <span>{totalCount} item{totalCount !== 1 ? 's' : ''} · Order before {DELIVERY_CUTOFF_HOUR > 12 ? DELIVERY_CUTOFF_HOUR - 12 : DELIVERY_CUTOFF_HOUR} PM for same-day delivery</span>
        </div>
      </div>

      <div className="cart-page-layout">
        <div className="cart-page-left">
          {items.length > 0 && (
            <div className="cart-items">
              {items.map((item) => <CartItem key={item.product} item={item} />)}
            </div>
          )}

          {printOrder && (
            <div className="print-cart-card">
              <div className="print-cart-header">
                <div className="print-cart-title"><Printer size={18} /><strong>Print Order</strong></div>
                <button className="print-cart-remove" onClick={clearPrintOrder} aria-label="Remove print order"><X size={16} /></button>
              </div>
              <div className="print-cart-details">
                <span>{printOrder.fileItems.length} file{printOrder.fileItems.length !== 1 ? 's' : ''}</span>
                <span>{printOrder.totalPages} pages</span>
              </div>
              {printOrder.filesLost && (
                <div className="print-cart-warning">Files were lost on page refresh. Please re-add from Print Store.</div>
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

        <div className="cart-page-right">
          <CartSummary />
          <div className="cart-actions">
            {items.length > 0 && <button className="btn-secondary" onClick={clearCart}>Clear Cart</button>}
            <button
              className="btn-primary"
              disabled={checkoutBlocked}
              style={checkoutBlocked ? { opacity: 0.5, cursor: 'not-allowed' } : {}}
              onClick={() => { if (!user) { navigate('/login'); return; } navigate('/checkout'); }}
            >
              Proceed to Checkout
            </button>
          </div>
          {checkoutBlocked && (
            <p className="cart-rx-blocked-hint">
              {rxStatus === 'pending'
                ? 'Waiting for prescription approval…'
                : rxStatus === 'clarification_required'
                ? 'Respond to clarification to unlock checkout'
                : 'Upload an approved prescription to unlock checkout'}
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default CartPage;
