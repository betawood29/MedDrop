// Order service — create orders, fetch user's orders, handle payments

import api from './api';

export const createOrder = (data) => api.post('/orders', data);

export const getOrders = () => api.get('/orders');

export const getOrder = (id) => api.get(`/orders/${id}`);

// Razorpay payment
export const createPaymentOrder = (data) => api.post('/payments/create-order', data);

export const verifyPayment = (data) => api.post('/payments/verify', data);
