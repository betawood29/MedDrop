// Shop page — homepage with hero, quick actions, categories, deals banner, and category-wise trending products

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, FileText, ChevronRight } from 'lucide-react';
import HeroBanner from '../components/shop/HeroBanner';
import QuickActions from '../components/shop/QuickActions';
import CategoryGrid from '../components/shop/CategoryGrid';
import ProductCard from '../components/shop/ProductCard';
import CartBar from '../components/shop/CartBar';
import Loader from '../components/common/Loader';
import {
  getCategories, getSubCategories, getTrendingByCategory, getTrendingProducts,
  getBuyAgainProducts, getSuggestedProducts,
} from '../services/productService';
import { useShopSocket } from '../hooks/useSocket';
import { useAuth } from '../hooks/useAuth';

const ShopPage = () => {
  const { user } = useAuth();
  const [categories, setCategories] = useState([]);
  const [trendingSections, setTrendingSections] = useState([]);
  const [trendingProducts, setTrendingProducts] = useState([]);
  const [buyAgainProducts, setBuyAgainProducts] = useState([]);
  const [suggested, setSuggested] = useState(null);
  const [loading, setLoading] = useState(true);
  const [categoriesWithSubs, setCategoriesWithSubs] = useState(new Set());
  const navigate = useNavigate();

  useEffect(() => {
    getCategories().then((res) => setCategories(res.data.data)).catch(console.error);
    getTrendingProducts(12).then((res) => setTrendingProducts(res.data.data)).catch(console.error);
    getSuggestedProducts().then((res) => setSuggested(res.data.data)).catch(console.error);
    getSubCategories().then((res) => {
      const subs = res.data.data || [];
      const parentSlugs = new Set();
      subs.forEach((s) => {
        if (s.parentCategory?.slug) parentSlugs.add(s.parentCategory.slug);
        (s.additionalCategories || []).forEach((c) => c.slug && parentSlugs.add(c.slug));
      });
      setCategoriesWithSubs(parentSlugs);
    }).catch(console.error);
  }, []);

  // Buy-again is personal — only fetch once we know who's logged in
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect -- resets on logout, fetch replaces it below when logged in
    if (!user) { setBuyAgainProducts([]); return; }
    getBuyAgainProducts().then((res) => setBuyAgainProducts(res.data.data)).catch(console.error);
  }, [user]);

  // Fetch trending products grouped by category
  useEffect(() => {
    getTrendingByCategory(8)
      .then((res) => setTrendingSections(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, []);

  // Real-time product updates
  const handleProductUpdate = useCallback((updatedProduct) => {
    const patch = (p) => (p._id === updatedProduct._id ? { ...p, ...updatedProduct } : p);
    setTrendingProducts((prev) => prev.map(patch));
    setTrendingSections((prev) =>
      prev.map((section) => ({ ...section, products: section.products.map(patch) }))
    );
    setBuyAgainProducts((prev) => prev.map(patch));
    setSuggested((prev) => (prev ? { ...prev, products: prev.products.map(patch) } : prev));
  }, []);

  useShopSocket(handleProductUpdate);

  const handleCategoryClick = (slug) => {
    if (categoriesWithSubs.has(slug)) {
      navigate(`/category/${slug}/sub`);
    } else {
      navigate(`/category/${slug}`);
    }
  };

  return (
    <div className="shop-page">
      <HeroBanner />
      <QuickActions />

      {/* Time-of-day contextual suggestions */}
      {suggested?.products?.length > 0 && (
        <section className="home-section">
          <div className="section-title-row">
            <h2 className="section-heading">{suggested.label}</h2>
            <button className="see-all-btn" onClick={() => navigate('/category/all')}>
              See all
            </button>
          </div>
          <div className="product-scroll-row">
            {suggested.products.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Prescription upload banner */}
      <button className="rx-home-banner" onClick={() => navigate('/prescription')}>
        <div className="rx-home-banner-left">
          <div className="rx-home-banner-icon">
            <FileText size={20} />
          </div>
          <div className="rx-home-banner-text">
            <strong>Have a prescription?</strong>
            <span>Upload it &amp; we'll arrange your medicines</span>
          </div>
        </div>
        <span className="rx-home-banner-cta">
          Upload Now <ChevronRight size={14} />
        </span>
      </button>

      <CategoryGrid categories={categories} categoriesWithSubs={categoriesWithSubs} />

      {/* Deals Banner */}
      <div className="deals-banner" onClick={() => navigate('/category/all')}>
        <div className="deals-banner-content">
          <div className="deals-banner-tag">HOT DEALS</div>
          <div className="deals-banner-title">Buy Again Deal</div>
          <div className="deals-banner-subtitle">Your favorites at the best prices, order again in one tap.</div>
          <button className="deals-banner-cta" onClick={(e) => { e.stopPropagation(); navigate('/category/all'); }}>
            Browse Deals <ArrowRight size={12} />
          </button>
        </div>
        <div className="deals-banner-image">
          <span className="deals-banner-emoji">🛍️</span>
        </div>
      </div>

      {/* Buy it again — personal repeat-purchase row */}
      {buyAgainProducts.length > 0 && (
        <section className="home-section">
          <div className="section-title-row">
            <h2 className="section-heading"> Buy it again</h2>
          </div>
          <div className="product-scroll-row">
            {buyAgainProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Trending Products */}
      {trendingProducts.length > 0 && (
        <section className="home-section">
          <div className="section-title-row">
            <h2 className="section-heading">🔥 Trending Products</h2>
            <button className="see-all-btn" onClick={() => navigate('/category/all')}>
              See all
            </button>
          </div>
          <div className="product-scroll-row">
            {trendingProducts.map((product) => (
              <ProductCard key={product._id} product={product} />
            ))}
          </div>
        </section>
      )}

      {/* Category-wise Trending Sections */}
      {loading ? (
        <Loader text="Loading products..." />
      ) : (
        trendingSections.map((section) => (
          <section key={section.category._id} className="home-section">
            <div className="section-title-row">
              <h2 className="section-heading">
                {section.category.icon && <span style={{ marginRight: 6 }}>{section.category.icon}</span>}
                {section.category.name}
              </h2>
              <button
                className="see-all-btn"
                onClick={() => handleCategoryClick(section.category.slug)}
              >
                See all
              </button>
            </div>
            <div className="product-scroll-row">
              {section.products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          </section>
        ))
      )}

      <CartBar />
    </div>
  );
};

export default ShopPage;
