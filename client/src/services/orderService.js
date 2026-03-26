// Order service — create orders, fetch user's orders

import api from './api';

export const createOrder = (data) => api.post('/orders', data);

export const getOrders = () => api.get('/orders');

export const getOrder = (id) => api.get(`/orders/${id}`);
