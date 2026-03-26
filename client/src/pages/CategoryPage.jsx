// Category page — browse products filtered by category (Blinkit-style)
// URL: /category/:slug — "all" slug shows everything

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SearchBar from '../components/common/SearchBar';
import CategoryBar from '../components/shop/CategoryBar';
import ProductGrid from '../components/shop/ProductGrid';
import CartBar from '../components/shop/CartBar';
import { getProducts, getCategories } from '../services/productService';
import { useShopSocket } from '../hooks/useSocket';

const CategoryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [activeCategory, setActiveCategory] = useState(slug === 'all' ? null : slug);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [categoryName, setCategoryName] = useState('');

  useEffect(() => {
    getCategories().then((res) => {
      setCategories(res.data.data);
      if (slug !== 'all') {
        const cat = res.data.data.find(c => c.slug === slug);
        if (cat) setCategoryName(cat.name);
      }
    }).catch(console.error);
  }, [slug]);

  const fetchProducts = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (activeCategory) params.category = activeCategory;
      if (search) params.search = search;
      const res = await getProducts(params);
      setProducts(res.data.data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoading(false);
    }
  }, [activeCategory, search]);

  useEffect(() => { fetchProducts(); }, [fetchProducts]);

  const handleCategorySelect = (catSlug) => {
    setActiveCategory(catSlug);
    if (catSlug) {
      navigate(`/category/${catSlug}`, { replace: true });
      const cat = categories.find(c => c.slug === catSlug);
      if (cat) setCategoryName(cat.name);
    } else {
      navigate('/category/all', { replace: true });
      setCategoryName('');
    }
  };

  // Real-time product updates from admin
  const handleProductUpdate = useCallback((updatedProduct) => {
    setProducts((prev) =>
      prev.map((p) =>
        p._id === updatedProduct._id ? { ...p, ...updatedProduct } : p
      )
    );
  }, []);

  useShopSocket(handleProductUpdate);

  const handleSearch = useCallback((q) => setSearch(q), []);

  return (
    <div className="shop-page">
      <div className="category-page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="category-page-title">{categoryName || 'All Products'}</h2>
      </div>

      <SearchBar onSearch={handleSearch} placeholder="Search in this category..." />
      <CategoryBar categories={categories} active={activeCategory} onSelect={handleCategorySelect} />
      <ProductGrid products={products} loading={loading} />
      <CartBar />
    </div>
  );
};

export default CategoryPage;
