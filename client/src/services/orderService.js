// Order service — fetch orders, initiate payment, verify & create order

import api from './api';

export const getOrders = () => api.get('/orders');

export const getOrder = (id) => api.get(`/orders/${id}`);

// Step 1: Initiate payment — validates cart, creates Razorpay order (no real order yet)
export const initiatePayment = (data) => api.post('/payments/initiate', data);

// Step 2: Verify payment & create order — only called after successful payment
export const verifyAndCreateOrder = (data) => api.post('/payments/verify', data);
