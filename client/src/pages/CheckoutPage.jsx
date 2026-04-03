// Checkout page — delivery form + order placement

import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import toast from 'react-hot-toast';
import CartSummary from '../components/cart/CartSummary';
import DeliveryForm from '../components/cart/DeliveryForm';
import { useCart } from '../hooks/useCart';
import { createOrder } from '../services/orderService';

const CheckoutPage = () => {
  const { items, clearCart } = useCart();
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handlePlaceOrder = async ({ hostel, gate, note }) => {
    setLoading(true);
    try {
      const orderData = {
        items: items.map((i) => ({ product: i.product, quantity: i.quantity })),
        hostel,
        gate,
        note,
        paymentMethod: 'cod', // Only COD for now (Razorpay not configured)
      };

      const res = await createOrder(orderData);
      clearCart();
      toast.success(res.data.message || 'Order placed!');
      navigate(`/orders/${res.data.data.orderId}`);
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
      <CartSummary />
      <DeliveryForm onSubmit={handlePlaceOrder} loading={loading} />
    </div>
  );
};

export default CheckoutPage;
