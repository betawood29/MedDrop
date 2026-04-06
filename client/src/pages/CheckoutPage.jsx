// Checkout page — handles both shop orders and print orders
// Delivery form + order summary + COD or Razorpay payment

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import CartSummary from '../components/cart/CartSummary';
import DeliveryForm from '../components/cart/DeliveryForm';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { createOrder, createPaymentOrder, verifyPayment } from '../services/orderService';
import { createPrintOrder } from '../services/printService';

const CheckoutPage = () => {
  const { items, printOrder, clearAll, hasAnything } = useCart();
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const openRazorpay = (razorpayOrderId, amount, keyId, orderId) => {
    return new Promise((resolve, reject) => {
      const options = {
        key: keyId,
        amount,
        currency: 'INR',
        name: 'MedDrop',
        description: `Order ${orderId}`,
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

  const handlePlaceOrder = async ({ hostel, gate, note, paymentMethod }) => {
    setLoading(true);
    try {
      let shopOrderId = null;

      // Step 1: Create shop order if there are shop items
      if (items.length > 0) {
        const orderData = {
          items: items.map((i) => ({ product: i.product, quantity: i.quantity })),
          hostel,
          gate,
          note,
          paymentMethod,
        };

        const res = await createOrder(orderData);
        const order = res.data.data;
        shopOrderId = order.orderId;

        // Handle online payment for shop order
        if (paymentMethod === 'upi') {
          try {
            const payRes = await createPaymentOrder({
              amount: order.total,
              orderId: order.orderId,
            });
            const { razorpayOrderId, amount, keyId } = payRes.data.data;
            const paymentResponse = await openRazorpay(razorpayOrderId, amount, keyId, order.orderId);
            await verifyPayment({
              razorpay_order_id: paymentResponse.razorpay_order_id,
              razorpay_payment_id: paymentResponse.razorpay_payment_id,
              razorpay_signature: paymentResponse.razorpay_signature,
            });
            toast.success('Payment successful!');
          } catch (payErr) {
            toast.error(payErr.message || 'Payment failed. You can retry from your orders.');
            clearAll();
            navigate(`/orders/${order.orderId}`);
            return;
          }
        }
      }

      // Step 2: Create print order if there's one in cart
      if (printOrder) {
        const formData = new FormData();
        printOrder.fileItems.forEach((f) => formData.append('files', f.file));
        const fileConfigs = printOrder.fileItems.map((f) => ({
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

      // Step 3: Success
      clearAll();
      if (items.length > 0 && printOrder) {
        toast.success('Shop order & print order placed!');
      } else if (printOrder) {
        toast.success('Print order placed!');
      } else {
        toast.success(paymentMethod === 'upi' ? 'Order placed & paid!' : 'Order placed!');
      }
      navigate(shopOrderId ? `/orders/${shopOrderId}` : '/orders');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
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

      <div className="checkout-layout">
        <div className="checkout-left">
          <DeliveryForm onSubmit={handlePlaceOrder} loading={loading} />
        </div>

        <div className="checkout-right">
          <CartSummary />
        </div>
      </div>
    </div>
  );
};

export default CheckoutPage;
