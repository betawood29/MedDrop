// Shop page — Blinkit-inspired homepage with banner, categories, quick actions, and trending products

import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import SearchBar from '../components/common/SearchBar';
import HeroBanner from '../components/shop/HeroBanner';
import QuickActions from '../components/shop/QuickActions';
import CategoryGrid from '../components/shop/CategoryGrid';
import ProductGrid from '../components/shop/ProductGrid';
import CartBar from '../components/shop/CartBar';
import { getProducts, getCategories } from '../services/productService';
import { useShopSocket } from '../hooks/useSocket';

const ShopPage = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [searchMode, setSearchMode] = useState(false);
  const navigate = useNavigate();

  useEffect(() => {
    getCategories().then((res) => setCategories(res.data.data)).catch(console.error);
  }, []);

  // Fetch trending/all products
  useEffect(() => {
    setLoading(true);
    const params = {};
    if (search) params.search = search;
    getProducts(params)
      .then((res) => setProducts(res.data.data))
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [search]);

  // Real-time product updates from admin (stock toggle, price changes)
  const handleProductUpdate = useCallback((updatedProduct) => {
    setProducts((prev) =>
      prev.map((p) =>
        p._id === updatedProduct._id ? { ...p, ...updatedProduct } : p
      )
    );
  }, []);

  useShopSocket(handleProductUpdate);

  const handleSearch = useCallback((q) => {
    setSearch(q);
    setSearchMode(!!q);
  }, []);

  return (
    <div className="shop-page">
      <SearchBar onSearch={handleSearch} placeholder="Search for medicines, snacks, essentials..." />

      {searchMode ? (
        // Search results mode — show products grid only
        <div className="search-results">
          <p className="search-results-label">
            {loading ? 'Searching...' : `${products.length} result${products.length !== 1 ? 's' : ''} for "${search}"`}
          </p>
          <ProductGrid products={products} loading={loading} />
        </div>
      ) : (
        // Home mode — banner, categories, trending
        <>
          <HeroBanner />
          <QuickActions />
          <CategoryGrid categories={categories} />

          <section className="home-section">
            <div className="section-title-row">
              <h2 className="section-heading">Trending Products</h2>
              <button className="see-all-btn" onClick={() => navigate('/category/all')}>See all</button>
            </div>
            <ProductGrid products={products} loading={loading} />
          </section>
        </>
      )}

      <CartBar />
    </div>
  );
};

export default ShopPage;
