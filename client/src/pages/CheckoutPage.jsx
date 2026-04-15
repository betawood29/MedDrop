// Checkout page — prepaid only
// Flow: initiate payment → Razorpay modal → verify & create order
// Rx items gate: blocks checkout when prescription status is none/pending/rejected/clarification_required
// Rx authorize-only: payment captured after admin confirms the Rx order

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, ShieldCheck, Upload, CheckCircle, Clock,
  AlertTriangle, MessageSquare, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import CartSummary from '../components/cart/CartSummary';
import DeliveryForm from '../components/cart/DeliveryForm';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { initiatePayment, verifyAndCreateOrder } from '../services/orderService';
import { createPrintOrder } from '../services/printService';
import { getMyPrescriptions } from '../services/prescriptionService';
import { RX_BLOCKING_STATUSES } from '../utils/constants';

// ── per-status banner config ─────────────────────────────────────────────────
const RX_BANNER = {
  approved: {
    icon: CheckCircle,
    className: 'checkout-rx-banner approved',
    title: 'Prescription Verified',
    body: 'Your prescription is approved — you can proceed with payment.',
    showUpload: false,
  },
  partially_approved: {
    icon: CheckCircle,
    className: 'checkout-rx-banner approved',
    title: 'Prescription Partially Approved',
    body: 'Some medicines are approved. Only approved items will be included in your order.',
    showUpload: false,
  },
  pending: {
    icon: Clock,
    className: 'checkout-rx-banner pending',
    title: 'Prescription Under Review',
    body: 'Checkout is blocked until our pharmacist approves your prescription.',
    showUpload: false,
  },
  clarification_required: {
    icon: MessageSquare,
    className: 'checkout-rx-banner clarify',
    title: 'Clarification Needed',
    body: 'Our pharmacist needs more information. Go to the Prescription page to respond.',
    showUpload: false,
    showViewRx: true,
  },
  rejected: {
    icon: AlertTriangle,
    className: 'checkout-rx-banner blocked',
    title: 'Prescription Rejected',
    body: 'Your prescription was rejected. Please upload a new one to proceed.',
    showUpload: true,
  },
  none: {
    icon: ShieldCheck,
    className: 'checkout-rx-banner blocked',
    title: 'Prescription Required',
    body: 'Your cart has prescription medicines. Upload a valid prescription to proceed.',
    showUpload: true,
  },
};

const CheckoutPage = () => {
  const { items, printOrder, getPrintOrderWithFiles, clearAll, hasAnything } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  // null = loading, 'approved' | 'partially_approved' | 'pending' | 'rejected' | 'clarification_required' | 'none'
  const [rxStatus, setRxStatus] = useState(null);
  const navigate = useNavigate();

  const rxItems   = items.filter((i) => i.requiresPrescription);
  const hasRxItems = rxItems.length > 0;

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

  useEffect(() => {
    if (!hasAnything) navigate('/cart');
  }, [hasAnything, navigate]);

  const checkoutBlocked = hasRxItems && user && RX_BLOCKING_STATUSES.has(rxStatus ?? 'none');
  const banner = rxStatus ? RX_BANNER[rxStatus] : null;
  const BannerIcon = banner?.icon;

  const openRazorpay = (razorpayOrderId, amount, keyId, authorizeOnly) => {
    return new Promise((resolve, reject) => {
      const options = {
        key: keyId,
        amount,
        currency: 'INR',
        name: 'MedDrop',
        description: authorizeOnly ? 'Prescription Order (Authorization Hold)' : 'Order Payment',
        order_id: razorpayOrderId,
        prefill: {
          contact: user?.phone ? `+91${user.phone}` : '',
        },
        theme: { color: '#7c3aed' },
        handler: (response) => resolve(response),
        modal: {
          ondismiss: () => reject(new Error('Payment cancelled')),
        },
      };

      const rzp = new window.Razorpay(options);
      rzp.on('payment.failed', (response) => {
        reject(new Error(response.error?.description || 'Payment failed'));
      });
      rzp.open();
    });
  };

  const handlePlaceOrder = async ({ hostel, gate, note }) => {
    setLoading(true);
    try {
      let shopOrderId = null;

      if (items.length > 0) {
        const cartItems = items.map((i) => ({ product: i.product, quantity: i.quantity }));

        // Step 1: Initiate payment (validates cart, creates Razorpay order)
        const initRes = await initiatePayment({ items: cartItems, hostel, gate, note });
        const { razorpayOrderId, amount, keyId, authorizeOnly } = initRes.data.data;

        // Step 2: Open Razorpay — authorize-only for Rx orders (captured after admin confirms)
        const paymentResponse = await openRazorpay(razorpayOrderId, amount, keyId, authorizeOnly);

        // Step 3: Verify payment & create actual order
        const verifyRes = await verifyAndCreateOrder({
          razorpay_order_id: paymentResponse.razorpay_order_id,
          razorpay_payment_id: paymentResponse.razorpay_payment_id,
          razorpay_signature: paymentResponse.razorpay_signature,
          items: cartItems,
          hostel,
          gate,
          note,
        });

        shopOrderId = verifyRes.data.data.orderId;
      }

      // Handle print order
      if (printOrder) {
        const printData = getPrintOrderWithFiles();
        if (printData.filesLost) {
          toast.error('Print files were lost. Please re-add from Print Store.');
          navigate('/print-store');
          return;
        }
        const formData = new FormData();
        printData.fileItems.forEach((f) => formData.append('files', f.file));
        const fileConfigs = printData.fileItems.map((f) => ({
          pages: f.pages,
          copies: f.copies,
          colorMode: f.colorMode,
          sides: f.sides,
          orientation: f.orientation,
        }));
        formData.append('fileConfigs', JSON.stringify(fileConfigs));
        formData.append('hostel', hostel);
        formData.append('gate', gate);
        formData.append('note', note);
        await createPrintOrder(formData);
      }

      clearAll();
      if (items.length > 0 && printOrder) {
        toast.success('Orders placed & paid!');
      } else if (printOrder) {
        toast.success('Print order placed!');
      } else {
        toast.success('Order placed & paid!');
      }
      navigate(shopOrderId ? `/orders/${shopOrderId}` : '/orders');
    } catch (err) {
      const msg = err.message || err.response?.data?.message || 'Something went wrong';
      if (msg === 'Payment cancelled') {
        toast.error('Payment cancelled. Try again when ready.');
      } else {
        toast.error(msg);
      }
    } finally {
      setLoading(false);
    }
  };

  if (!hasAnything) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="page-title">Checkout</h2>
      </div>

      {/* Prescription status banner */}
      {hasRxItems && banner && (
        <div className={banner.className}>
          {BannerIcon && <BannerIcon size={18} className="checkout-rx-icon" />}
          <div className="checkout-rx-text">
            <strong>{banner.title}</strong>
            <p>{banner.body}</p>
          </div>
          {banner.showUpload && (
            <button className="checkout-rx-btn" onClick={() => navigate('/prescription')}>
              <Upload size={14} /> Upload Rx
            </button>
          )}
          {banner.showViewRx && (
            <button
              className="checkout-rx-btn"
              style={{ background: '#7c3aed' }}
              onClick={() => navigate('/prescription')}
            >
              <MessageSquare size={14} /> View Clarification
            </button>
          )}
        </div>
      )}

      {/* Authorize-only notice for approved Rx orders */}
      {hasRxItems && !checkoutBlocked && rxStatus && (
        <div className="checkout-rx-authorize-notice">
          <Info size={15} />
          <span>
            Your payment will be <strong>held</strong> (not charged) until our pharmacist confirms
            your prescription. You won&apos;t be charged if the order is cancelled.
          </span>
        </div>
      )}

      <div className="checkout-layout">
        <div className="checkout-left">
          <DeliveryForm
            onSubmit={handlePlaceOrder}
            loading={loading}
            disabled={checkoutBlocked}
          />
        </div>
        <div className="checkout-right">
          <CartSummary />
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
