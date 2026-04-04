// Admin service — dashboard, order management, product CRUD, categories, Excel

import api from './api';

// Use a separate axios instance for admin routes with admin token
const adminApi = () => {
  const token = localStorage.getItem('adminToken');
  if (!token) {
    // Redirect to admin login if token is missing
    window.location.href = '/admin';
    throw new Error('Admin session expired');
  }
  return {
    headers: { Authorization: `Bearer ${token}` },
  };
};

export const adminLogin = (phone, password) =>
  api.post('/admin/login', { phone, password });

export const getDashboard = (params) =>
  api.get('/admin/dashboard', { ...adminApi(), params });

export const getAdminOrders = (params) =>
  api.get('/admin/orders', { ...adminApi(), params });

export const updateOrderStatus = (id, status, note) =>
  api.patch(`/admin/orders/${id}`, { status, note }, adminApi());

export const getAdminProducts = (params) =>
  api.get('/admin/products', { ...adminApi(), params });

export const createProduct = (data) =>
  api.post('/admin/products', data, adminApi());

export const updateProduct = (id, data) =>
  api.put(`/admin/products/${id}`, data, adminApi());

export const patchProduct = (id, data) =>
  api.patch(`/admin/products/${id}`, data, adminApi());

export const deleteProduct = (id) =>
  api.delete(`/admin/products/${id}`, adminApi());

export const uploadProductImage = (formData) =>
  api.post('/admin/products/upload-image', formData, {
    ...adminApi(),
    headers: { ...adminApi().headers, 'Content-Type': 'multipart/form-data' },
  });

export const uploadExcel = (formData) =>
  api.post('/admin/products/upload-excel', formData, {
    ...adminApi(),
    headers: { ...adminApi().headers, 'Content-Type': 'multipart/form-data' },
  });

export const downloadTemplate = () =>
  api.get('/admin/products/download-template', { ...adminApi(), responseType: 'blob' });

export const getAdminCategories = () =>
  api.get('/admin/categories', adminApi());

export const createCategory = (data) =>
  api.post('/admin/categories', data, adminApi());

export const updateCategory = (id, data) =>
  api.put(`/admin/categories/${id}`, data, adminApi());

export const deleteCategory = (id) =>
  api.delete(`/admin/categories/${id}`, adminApi());

export const uploadCategoryImage = (formData) =>
  api.post('/admin/categories/upload-image', formData, {
    ...adminApi(),
    headers: { ...adminApi().headers, 'Content-Type': 'multipart/form-data' },
  });

// SubCategory management
export const getAdminSubCategories = (params) =>
  api.get('/admin/subcategories', { ...adminApi(), params });

export const createSubCategory = (data) =>
  api.post('/admin/subcategories', data, adminApi());

export const updateSubCategory = (id, data) =>
  api.put(`/admin/subcategories/${id}`, data, adminApi());

export const deleteSubCategory = (id) =>
  api.delete(`/admin/subcategories/${id}`, adminApi());

export const uploadSubCategoryImage = (formData) =>
  api.post('/admin/subcategories/upload-image', formData, {
    ...adminApi(),
    headers: { ...adminApi().headers, 'Content-Type': 'multipart/form-data' },
  });

// Print order management
export const getAdminPrintOrders = (params) =>
  api.get('/admin/print-orders', { ...adminApi(), params });

export const updatePrintOrderStatus = (id, status) =>
  api.patch(`/admin/print-orders/${id}`, { status }, adminApi());
