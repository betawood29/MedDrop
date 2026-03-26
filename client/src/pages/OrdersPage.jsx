// Orders page — list of user's orders

import { ClipboardList } from 'lucide-react';
import OrderCard from '../components/orders/OrderCard';
import Loader from '../components/common/Loader';
import { useOrders } from '../hooks/useOrders';

const OrdersPage = () => {
  const { orders, loading, error } = useOrders();

  if (loading) return <Loader text="Loading orders..." />;

  return (
    <div className="page-container">
      <h2 className="page-title">My Orders</h2>

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
