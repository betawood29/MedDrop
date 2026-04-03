// Orders page — list of user's orders

import { useNavigate } from 'react-router-dom';
import { ClipboardList, ArrowLeft } from 'lucide-react';
import OrderCard from '../components/orders/OrderCard';
import Loader from '../components/common/Loader';
import { useOrders } from '../hooks/useOrders';

const OrdersPage = () => {
  const { orders, loading, error } = useOrders();
  const navigate = useNavigate();

  if (loading) return <Loader text="Loading orders..." />;

  return (
    <div className="page-container">
      <div className="page-header">
        <button className="back-btn" onClick={() => navigate(-1)} aria-label="Go back">
          <ArrowLeft size={20} />
        </button>
        <h2 className="page-title">My Orders</h2>
      </div>

      {error && <div className="error-banner">{error}</div>}

      {orders.length === 0 ? (
        <div className="empty-state">
          <ClipboardList size={48} />
          <h3>No orders yet</h3>
          <p>Place your first order from the shop</p>
        </div>
      ) : (
        <div className="orders-list">
          {orders.map((order) => <OrderCard key={order._id} order={order} />)}
        </div>
      )}
    </div>
  );
};

export default OrdersPage;
