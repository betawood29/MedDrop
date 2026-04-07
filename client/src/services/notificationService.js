import api from './api';

export const getVapidPublicKey = () => api.get('/notifications/vapid-public-key');
export const saveSubscription = (subscription) => api.post('/notifications/subscribe', { subscription });
export const removeSubscription = (endpoint) => api.delete('/notifications/subscribe', { data: { endpoint } });
