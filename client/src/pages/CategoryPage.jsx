// Category page — browse products filtered by category (Blinkit-style)
// URL: /category/:slug — "all" slug shows everything

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import CategoryBar from '../components/shop/CategoryBar';
import ProductGrid from '../components/shop/ProductGrid';
import CartBar from '../components/shop/CartBar';
import { getProducts, getCategories, getSubCategories } from '../services/productService';
import { useShopSocket } from '../hooks/useSocket';

const PAGE_LIMIT = 20;

const CategoryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [categoriesWithSubs, setCategoriesWithSubs] = useState(new Set());
  const [activeCategory, setActiveCategory] = useState(slug === 'all' ? null : slug);
  const [loading, setLoading] = useState(true);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const sentinelRef = useRef(null);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const isFetchingRef = useRef(false);
  const activeCategoryRef = useRef(activeCategory);

  useEffect(() => {
    activeCategoryRef.current = activeCategory;
  }, [activeCategory]);

  useEffect(() => {
    Promise.all([
      getCategories(),
      getSubCategories(),
    ]).then(([catRes, subRes]) => {
      const cats = catRes.data.data;
      setCategories(cats);
      if (slug !== 'all') {
        const cat = cats.find(c => c.slug === slug);
        if (cat) setCategoryName(cat.name);
      }
      // Build set of category slugs that have subcategories
      const subs = subRes.data.data || [];
      const withSubs = new Set();
      subs.forEach(s => {
        if (s.parentCategory?.slug) withSubs.add(s.parentCategory.slug);
        (s.additionalCategories || []).forEach(c => c.slug && withSubs.add(c.slug));
      });
      setCategoriesWithSubs(withSubs);
    }).catch(console.error);
  }, [slug]);

  // Reset and fetch page 1 whenever activeCategory changes
  useEffect(() => {
    pageRef.current = 1;
    hasMoreRef.current = false;
    isFetchingRef.current = false;
    setHasMore(false);
    setProducts([]);
    setLoading(true);

    const fetchPage1 = async () => {
      try {
        const params = { page: 1, limit: PAGE_LIMIT };
        if (activeCategory) params.category = activeCategory;
        const res = await getProducts(params);
        setProducts(res.data.data);
        const p = res.data.pagination;
        const more = p && p.page < p.pages;
        hasMoreRef.current = more;
        setHasMore(more);
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchPage1();
  }, [activeCategory]);

  // Stable loadMore — reads current values from refs, no stale closure
  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMoreRef.current) return;
    isFetchingRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const params = { page: nextPage, limit: PAGE_LIMIT };
      if (activeCategoryRef.current) params.category = activeCategoryRef.current;
      const res = await getProducts(params);
      setProducts(prev => [...prev, ...res.data.data]);
      const p = res.data.pagination;
      const more = p && p.page < p.pages;
      hasMoreRef.current = more;
      setHasMore(more);
      pageRef.current = nextPage;
    } catch (err) {
      console.error('Failed to load more products:', err);
    } finally {
      isFetchingRef.current = false;
      setLoadingMore(false);
    }
  }, []);

  // IntersectionObserver — stable, set up once
  useEffect(() => {
    const sentinel = sentinelRef.current;
    if (!sentinel) return;
    const observer = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) loadMore(); },
      { rootMargin: '300px' }
    );
    observer.observe(sentinel);
    return () => observer.disconnect();
  }, [loadMore]);

  const handleCategorySelect = (catSlug) => {
    if (!catSlug) {
      navigate('/category/all', { replace: true });
      setActiveCategory(null);
      setCategoryName('');
      return;
    }
    // If the category has subcategories, go to the subcategory layout page
    if (categoriesWithSubs.has(catSlug)) {
      navigate(`/category/${catSlug}/sub`);
      return;
    }
    navigate(`/category/${catSlug}`, { replace: true });
    setActiveCategory(catSlug);
    const cat = categories.find(c => c.slug === catSlug);
    if (cat) setCategoryName(cat.name);
  };

  const handleProductUpdate = useCallback((updatedProduct) => {
    setProducts(prev =>
      prev.map(p => p._id === updatedProduct._id ? { ...p, ...updatedProduct } : p)
    );
  }, []);
  useShopSocket(handleProductUpdate);

  return (
    <div className="shop-page">
      <div className="category-page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="category-page-title">{categoryName || 'All Products'}</h2>
      </div>

      <CategoryBar categories={categories} active={activeCategory} onSelect={handleCategorySelect} />
      <ProductGrid products={products} loading={loading} />

      {/* Infinite scroll sentinel */}
      <div ref={sentinelRef} style={{ height: 1 }} />
      {loadingMore && (
        <div className="infinite-scroll-loader">
          <div className="loader-spinner" />
        </div>
      )}
      {!loading && !hasMore && products.length > 0 && (
        <p className="infinite-scroll-end">All products loaded</p>
      )}

      <CartBar />
    </div>
  );
};

export default CategoryPage;
