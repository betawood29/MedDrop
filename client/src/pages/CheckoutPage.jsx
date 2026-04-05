// Checkout page — delivery form + order summary + COD or Razorpay payment

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import CartSummary from '../components/cart/CartSummary';
import DeliveryForm from '../components/cart/DeliveryForm';
import { useCart } from '../hooks/useCart';
import { useAuth } from '../hooks/useAuth';
import { createOrder, createPaymentOrder, verifyPayment } from '../services/orderService';

const CheckoutPage = () => {
  const { items, total, clearCart } = useCart();
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
      // Step 1: Create the order on backend
      const orderData = {
        items: items.map((i) => ({ product: i.product, quantity: i.quantity })),
        hostel,
        gate,
        note,
        paymentMethod,
      };

      const res = await createOrder(orderData);
      const order = res.data.data;

      // Step 2: If online payment, open Razorpay
      if (paymentMethod === 'upi') {
        try {
          // Create Razorpay order
          const payRes = await createPaymentOrder({
            amount: order.total,
            orderId: order.orderId,
          });
          const { razorpayOrderId, amount, keyId } = payRes.data.data;

          // Open Razorpay checkout modal
          const paymentResponse = await openRazorpay(razorpayOrderId, amount, keyId, order.orderId);

          // Verify payment
          await verifyPayment({
            razorpay_order_id: paymentResponse.razorpay_order_id,
            razorpay_payment_id: paymentResponse.razorpay_payment_id,
            razorpay_signature: paymentResponse.razorpay_signature,
          });

          toast.success('Payment successful!');
        } catch (payErr) {
          // Order is created but payment failed — user can retry from order detail
          toast.error(payErr.message || 'Payment failed. You can retry from your orders.');
          clearCart();
          navigate(`/orders/${order.orderId}`);
          return;
        }
      }

      // Step 3: Success — clear cart and go to order
      clearCart();
      toast.success(paymentMethod === 'upi' ? 'Order placed & paid!' : 'Order placed!');
      navigate(`/orders/${order.orderId}`);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (items.length === 0) navigate('/cart');
  }, [items.length, navigate]);

  if (items.length === 0) return null;

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
