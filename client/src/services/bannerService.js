// Banner service — fetch and manage hero banners

import api from './api';

// Public
export const getActiveBanner = () => api.get('/banner/active');

// Admin
export const getBanners = () => api.get('/admin/banner');
export const createBanner = (data) => api.post('/admin/banner', data);
export const updateBanner = (id, data) => api.put(`/admin/banner/${id}`, data);
export const deleteBanner = (id) => api.delete(`/admin/banner/${id}`);
export const uploadBannerImage = (formData) =>
  api.post('/admin/banner/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
