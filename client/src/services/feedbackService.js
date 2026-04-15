import api from './api';

export const submitFeedback = (data) => api.post('/feedback', data);

// Admin
export const getFeedbackList = (params) => api.get('/feedback', { params });
export const updateFeedbackStatus = (id, status) => api.patch(`/feedback/${id}`, { status });
