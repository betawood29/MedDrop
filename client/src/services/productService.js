// Product service — fetch products and categories

import api from './api';

export const getProducts = (params) => api.get('/products', { params });

export const getProduct = (id) => api.get(`/products/${id}`);

export const getCategories = () => api.get('/categories');

export const getSubCategories = (params) => api.get('/subcategories', { params });

export const getSubCategoryProducts = (slug) => api.get(`/subcategories/${slug}/products`);

export const searchProducts = (q, limit = 20) => api.get('/search', { params: { q, limit } });

export const getPopularSearches = (limit = 8) => api.get('/search/popular', { params: { limit } });

export const getTrendingByCategory = (limit = 8) => api.get('/products/trending', { params: { limit } });

export const getTrendingProducts = (limit = 12) => api.get('/products/trending/all', { params: { limit } });

export const getBuyAgainProducts = () => api.get('/recommendations/buy-again');

export const getFrequentlyBoughtTogether = (productId) =>
  api.get(`/recommendations/frequently-bought-together/${productId}`);

export const getSuggestedProducts = () => api.get('/recommendations/suggested');
