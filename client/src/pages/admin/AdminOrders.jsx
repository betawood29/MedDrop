// Admin orders page — full order management with filters

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import OrderTable from '../../components/admin/OrderTable';
import Loader from '../../components/common/Loader';
import { getAdminOrders, updateOrderStatus } from '../../services/adminService';
import { ORDER_STATUSES } from '../../utils/constants';

const AdminOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('today');

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;
      const res = await getAdminOrders(params);
      setOrders(res.data.data);
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchOrders(); }, [statusFilter, dateFilter]);

  const handleStatusChange = async (orderId, status) => {
    try {
      await updateOrderStatus(orderId, status);
      toast.success(`Updated to ${ORDER_STATUSES[status].label}`);
      fetchOrders();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  return (
    <div className="admin-page">
      <h2>Orders</h2>

      <div className="filter-bar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
          <option value="">All Statuses</option>
          {Object.entries(ORDER_STATUSES).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="input">
          <option value="today">Today</option>
          <option value="">All Time</option>
        </select>
      </div>

      {loading ? <Loader /> : <OrderTable orders={orders} onStatusChange={handleStatusChange} loading={loading} />}
    </div>
  );
};

export default AdminOrders;
