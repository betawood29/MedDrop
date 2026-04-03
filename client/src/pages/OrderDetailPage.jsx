// Order detail page — full order info with real-time tracking via Socket.io

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import OrderDetailComponent from '../components/orders/OrderDetail';
import Loader from '../components/common/Loader';
import { getOrder } from '../services/orderService';
import { useSocket } from '../hooks/useSocket';

const OrderDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [order, setOrder] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchOrder = async () => {
      try {
        const res = await getOrder(id);
        setOrder(res.data.data);
      } catch (err) {
        setError(err.response?.data?.message || 'Order not found');
      } finally {
        setLoading(false);
      }
    };
    fetchOrder();
  }, [id]);

  // Real-time updates (toast is handled globally by OrderNotifications)
  const handleOrderUpdate = useCallback((data) => {
    setOrder((prev) => prev ? { ...prev, status: data.status, statusHistory: data.statusHistory } : prev);
  }, []);

  useSocket(order?.orderId, handleOrderUpdate);

  if (loading) return <Loader text="Loading order..." />;
  if (error) return <div className="page-container"><div className="error-banner">{error}</div></div>;
  if (!order) return null;

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="page-title">Order Details</h2>
      </div>
      <OrderDetailComponent order={order} />
    </div>
  );
};

export default OrderDetailPage;
