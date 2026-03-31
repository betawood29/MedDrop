// Product service — fetch products and categories

import api from './api';

export const getProducts = (params) => api.get('/products', { params });

export const getProduct = (id) => api.get(`/products/${id}`);

export const getCategories = () => api.get('/categories');

export const getSubCategories = (params) => api.get('/subcategories', { params });

export const getSubCategoryProducts = (slug) => api.get(`/subcategories/${slug}/products`);
