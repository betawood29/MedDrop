// Admin orders page — shop orders + print orders with tab toggle

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import OrderTable from '../../components/admin/OrderTable';
import PrintOrderTable from '../../components/admin/PrintOrderTable';
import Loader from '../../components/common/Loader';
import { getAdminOrders, updateOrderStatus, getAdminPrintOrders, updatePrintOrderStatus } from '../../services/adminService';
import { ORDER_STATUSES, PRINT_ORDER_STATUSES } from '../../utils/constants';

const AdminOrders = () => {
  const [tab, setTab] = useState('shop'); // 'shop' | 'print'
  const [orders, setOrders] = useState([]);
  const [printOrders, setPrintOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('');
  const [dateFilter, setDateFilter] = useState('today');

  const fetchOrders = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFilter) params.date = dateFilter;

      if (tab === 'shop') {
        const res = await getAdminOrders(params);
        setOrders(res.data.data);
      } else {
        const res = await getAdminPrintOrders(params);
        setPrintOrders(res.data.data || []);
      }
    } catch (err) {
      toast.error('Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, [tab, statusFilter, dateFilter]);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  const handleTabChange = (newTab) => {
    setTab(newTab);
    setStatusFilter('');
  };

  const handleStatusChange = async (orderId, status) => {
    try {
      if (tab === 'shop') {
        await updateOrderStatus(orderId, status);
        toast.success(`Updated to ${ORDER_STATUSES[status]?.label}`);
      } else {
        await updatePrintOrderStatus(orderId, status);
        toast.success(`Updated to ${PRINT_ORDER_STATUSES[status]?.label}`);
      }
      fetchOrders();
    } catch (err) {
      toast.error('Failed to update');
    }
  };

  const statuses = tab === 'shop' ? ORDER_STATUSES : PRINT_ORDER_STATUSES;

  return (
    <div className="admin-page">
      <h2>Orders</h2>

      {/* Tab toggle */}
      <div className="admin-order-tabs">
        <button className={`admin-order-tab ${tab === 'shop' ? 'active' : ''}`} onClick={() => handleTabChange('shop')}>
          Shop Orders
        </button>
        <button className={`admin-order-tab ${tab === 'print' ? 'active' : ''}`} onClick={() => handleTabChange('print')}>
          Print Orders
        </button>
      </div>

      <div className="filter-bar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
          <option value="">All Statuses</option>
          {Object.entries(statuses).map(([key, val]) => (
            <option key={key} value={key}>{val.label}</option>
          ))}
        </select>
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="input">
          <option value="today">Today</option>
          <option value="">All Time</option>
        </select>
      </div>

      {loading ? <Loader /> : tab === 'shop' ? (
        <OrderTable orders={orders} onStatusChange={handleStatusChange} loading={loading} />
      ) : (
        <PrintOrderTable orders={printOrders} onStatusChange={handleStatusChange} loading={loading} />
      )}
    </div>
  );
};

export default AdminOrders;
