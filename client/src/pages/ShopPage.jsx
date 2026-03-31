// Shop page — Blinkit-inspired homepage with banner, categories, quick actions, and trending products

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import HeroBanner from '../components/shop/HeroBanner';
import QuickActions from '../components/shop/QuickActions';
import CategoryGrid from '../components/shop/CategoryGrid';
import ProductGrid from '../components/shop/ProductGrid';
import CartBar from '../components/shop/CartBar';
import { getProducts, getCategories, getSubCategories } from '../services/productService';
import { useShopSocket } from '../hooks/useSocket';

const ShopPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [categoriesWithSubs, setCategoriesWithSubs] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    getCategories().then((res) => setCategories(res.data.data)).catch(console.error);
    getSubCategories().then((res) => {
      const subs = res.data.data || [];
      const parentSlugs = new Set();
      subs.forEach((s) => {
        if (s.parentCategory?.slug) parentSlugs.add(s.parentCategory.slug);
      });
      setCategoriesWithSubs(parentSlugs);
    }).catch(console.error);
  }, []);

  // Fetch trending products
  useEffect(() => {
    setLoading(true);
    getProducts({})
      .then((res) => setProducts(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Real-time product updates from admin
  const handleProductUpdate = useCallback((updatedProduct) => {
    setProducts((prev) =>
      prev.map((p) =>
        p._id === updatedProduct._id ? { ...p, ...updatedProduct } : p
      )
    );
  }, []);

  useShopSocket(handleProductUpdate);

  return (
    <div className="shop-page">
      <HeroBanner />
      <QuickActions />
      <CategoryGrid categories={categories} categoriesWithSubs={categoriesWithSubs} />

      <section className="home-section">
        <div className="section-title-row">
          <h2 className="section-heading">Trending Products</h2>
          <button className="see-all-btn" onClick={() => navigate('/category/all')}>See all</button>
        </div>
        <ProductGrid products={products} loading={loading} />
      </section>

      <CartBar />
    </div>
  );
};

export default ShopPage;
