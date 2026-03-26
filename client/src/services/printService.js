// Print store service — pricing, file upload, order management

import api from './api';

export const getPricing = () => api.get('/print/pricing');

export const createPrintOrder = (formData) =>
  api.post('/print/order', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });

export const getPrintOrders = () => api.get('/print/orders');

export const getPrintOrder = (id) => api.get(`/print/orders/${id}`);
