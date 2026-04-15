// Checkout page — prepaid only
// Flow: initiate payment → Razorpay modal → verify & create order
// No order is created until payment succeeds

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, ShieldCheck, Upload, CheckCircle, Clock } from 'lucide-react';
import toast from 'react-hot-toast';
import CartSummary from '../components/cart/CartSummary';
import DeliveryForm from '../components/cart/DeliveryForm';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { initiatePayment, verifyAndCreateOrder } from '../services/orderService';
import { createPrintOrder } from '../services/printService';
import { getMyPrescriptions } from '../services/prescriptionService';

const CheckoutPage = () => {
  const { items, printOrder, getPrintOrderWithFiles, clearAll, hasAnything } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const [rxStatus, setRxStatus] = useState(null); // null | 'approved' | 'pending' | 'none'
  const navigate = useNavigate();

  // Check if any cart item requires a prescription
  const hasRxItems = items.some((i) => i.requiresPrescription);

  // If cart has Rx items, check if user has a valid prescription
  useEffect(() => {
    if (!hasRxItems || !user) return;
    getMyPrescriptions()
      .then((res) => {
        const prescriptions = res.data.data || [];
        // "unused" = approved, not linked to any previous order, no delivery request
        const hasUnusedApproved = prescriptions.some(
          (p) => p.status === 'approved' && !p.order && !p.deliveryRequest?.hostel
        );
        const hasPending = prescriptions.some((p) => p.status === 'pending');

        if (hasUnusedApproved) {
          setRxStatus('approved');
        } else if (hasPending) {
          setRxStatus('pending');
        } else {
          setRxStatus('none');
        }
      })
      .catch(() => setRxStatus('none'));
  }, [hasRxItems, user]);

  const openRazorpay = (razorpayOrderId, amount, keyId) => {
    return new Promise((resolve, reject) => {
      const options = {
        key: keyId,
        amount,
        currency: 'INR',
        name: 'MedDrop',
        description: 'Order Payment',
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

      // Handle shop items — pay first, then create order
      if (items.length > 0) {
        const cartItems = items.map((i) => ({ product: i.product, quantity: i.quantity }));

        // Step 1: Initiate payment (validates cart, creates Razorpay order — NO real order yet)
        const initRes = await initiatePayment({ items: cartItems, hostel, gate, note });
        const { razorpayOrderId, amount, keyId } = initRes.data.data;

        // Step 2: Open Razorpay checkout modal
        const paymentResponse = await openRazorpay(razorpayOrderId, amount, keyId);

        // Step 3: Verify payment & create actual order (only runs if payment succeeded)
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

      // Success — clear cart and navigate
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
      // Payment failed/cancelled — stay on checkout, cart untouched
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

  useEffect(() => {
    if (!hasAnything) navigate('/cart');
  }, [hasAnything, navigate]);

  if (!hasAnything) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="page-title">Checkout</h2>
      </div>

      {/* Prescription status banner for Rx items */}
      {hasRxItems && rxStatus === 'approved' && (
        <div className="checkout-rx-banner approved">
          <CheckCircle size={18} className="checkout-rx-icon" />
          <div className="checkout-rx-text">
            <strong>Prescription Verified</strong>
            <p>Your prescription has been approved. You can proceed with the order.</p>
          </div>
        </div>
      )}
      {hasRxItems && rxStatus === 'pending' && (
        <div className="checkout-rx-banner pending">
          <Clock size={18} className="checkout-rx-icon" />
          <div className="checkout-rx-text">
            <strong>Prescription Under Review</strong>
            <p>Your prescription is being reviewed by our pharmacist. You can place the order now — it will only be dispatched after approval.</p>
          </div>
        </div>
      )}
      {hasRxItems && rxStatus === 'none' && (
        <div className="checkout-rx-banner blocked">
          <ShieldCheck size={18} className="checkout-rx-icon" />
          <div className="checkout-rx-text">
            <strong>Prescription Required</strong>
            <p>Your cart has prescription medicines. Upload a prescription to proceed.</p>
          </div>
          <button className="checkout-rx-btn" onClick={() => navigate('/prescription')}>
            <Upload size={14} /> Upload Rx
          </button>
        </div>
      )}

      <div className="checkout-layout">
        <div className="checkout-left">
          <DeliveryForm
            onSubmit={handlePlaceOrder}
            loading={loading}
            disabled={hasRxItems && rxStatus === 'none'}
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
