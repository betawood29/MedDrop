// Print store service — pricing, file upload, order management

import api from './api';

export const getPricing = () => api.get('/print/pricing');

// Stages files for a prepaid print order (no order/charge yet) — checkout calls this
// before initiating payment, then pays for shop + print together in one Razorpay charge.
export const uploadPrintFiles = (formData) =>
  api.post('/print/upload-files', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

// Legacy Cash-on-Delivery print order — no longer used by checkout, kept for compatibility.
export const createPrintOrder = (formData) =>
  api.post('/print/order', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getPrintOrders = () => api.get('/print/orders');

export const getPrintOrder = (id) => api.get(`/print/orders/${id}`);
