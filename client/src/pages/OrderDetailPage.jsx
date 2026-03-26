// Order detail page — full order info with real-time tracking via Socket.io

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import OrderDetailComponent from '../components/orders/OrderDetail';
import Loader from '../components/common/Loader';
import { getOrder } from '../services/orderService';
import { useSocket } from '../hooks/useSocket';

const OrderDetailPage = () => {
  const { id } = useParams();
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
      <OrderDetailComponent order={order} />
    </div>
  );
};

export default OrderDetailPage;
