import api from './api';

export const submitFeedback = (data) => api.post('/feedback', data);
