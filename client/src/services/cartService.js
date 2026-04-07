// Cart service — server-side cart sync
import api from './api';

export const getServerCart = () => api.get('/cart');
export const saveServerCart = (items) => api.put('/cart', { items });
