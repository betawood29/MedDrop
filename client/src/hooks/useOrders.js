// Hook for fetching user's orders (shop + print) with loading/error state

import { useState, useEffect, useCallback } from 'react';
import { getOrders } from '../services/orderService';
import { getPrintOrders } from '../services/printService';

export const useOrders = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchOrders = useCallback(async () => {
    try {
      setLoading(true);
      const [shopRes, printRes] = await Promise.all([
        getOrders().catch(() => ({ data: { data: [] } })),
        getPrintOrders().catch(() => ({ data: { data: [] } })),
      ]);

      const shopOrders = (shopRes.data.data || []).map((o) => ({ ...o, orderType: 'shop' }));
      const printOrders = (printRes.data.data || []).map((o) => ({ ...o, orderType: 'print' }));

      // Merge and sort by createdAt descending
      const all = [...shopOrders, ...printOrders].sort(
        (a, b) => new Date(b.createdAt) - new Date(a.createdAt)
      );

      setOrders(all);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load orders');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchOrders(); }, [fetchOrders]);

  return { orders, loading, error, refetch: fetchOrders };
};
