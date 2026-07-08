// SubCategory page — Blinkit-style sidebar layout
// Left: vertical scrollable subcategory list with icons/images
// Right: products grid for the active subcategory with infinite scroll
// URL: /category/:slug/sub

import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ProductCard from '../components/shop/ProductCard';
import CartBar from '../components/shop/CartBar';
import Loader from '../components/common/Loader';
import { getSubCategories, getProducts, getCategories } from '../services/productService';
import { useShopSocket } from '../hooks/useSocket';

const PAGE_LIMIT = 20;
const ALL_TAB = '__all__';

const SubCategoryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [subCategories, setSubCategories] = useState([]);
  const [activeSub, setActiveSub] = useState(ALL_TAB);
  const [products, setProducts] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);
  const [hasMore, setHasMore] = useState(false);
  const [categoryName, setCategoryName] = useState('');
  const contentRef = useRef(null);
  const pageRef = useRef(1);
  const hasMoreRef = useRef(false);
  const isFetchingRef = useRef(false);
  const activeSubRef = useRef(ALL_TAB);

  useEffect(() => {
    activeSubRef.current = activeSub;
  }, [activeSub]);

  // Load subcategories first
  useEffect(() => {
    const load = async () => {
      setLoadingSubs(true);
      try {
        const [subRes, catRes] = await Promise.all([
          getSubCategories({ category: slug }),
          getCategories(),
        ]);
        const subs = subRes.data.data || [];
        setSubCategories(subs);
        // Derive the page title from the route's own category, not from a subcategory's
        // parent — a subcategory can now be reached via additionalCategories too, so its
        // stored parent isn't necessarily the category the user is currently browsing.
        const routeCategory = (catRes.data.data || []).find((c) => c.slug === slug);
        if (routeCategory) setCategoryName(routeCategory.name);
        setActiveSub(ALL_TAB);
      } catch (err) {
        console.error('Failed to load subcategories:', err);
      } finally {
        setLoadingSubs(false);
        // loadingSubs = false triggers the fetchPage1 effect and scroll effects below
      }
    };
    load();
  }, [slug]);

  const buildParams = useCallback((page, sub) => {
    const params = { page, limit: PAGE_LIMIT };
    if (sub === ALL_TAB) {
      params.category = slug;
    } else {
      params.subCategory = sub.slug;
    }
    return params;
  }, [slug]);

  const loadMore = useCallback(async () => {
    if (isFetchingRef.current || !hasMoreRef.current) return;
    isFetchingRef.current = true;
    setLoadingMore(true);
    try {
      const nextPage = pageRef.current + 1;
      const res = await getProducts(buildParams(nextPage, activeSubRef.current));
      setProducts(prev => [...prev, ...res.data.data]);
      const p = res.data.pagination;
      const more = p && p.page < p.pages;
      hasMoreRef.current = more;
      setHasMore(more);
      pageRef.current = nextPage;
    } catch (err) {
      console.error('Failed to load more:', err);
    } finally {
      isFetchingRef.current = false;
      setLoadingMore(false);
    }
  }, [buildParams]);

  // Check scroll position and load more if near the bottom
  const checkAndLoadMore = useCallback(() => {
    const content = contentRef.current;
    if (!content || isFetchingRef.current || !hasMoreRef.current) return;
    const distanceFromBottom = content.scrollHeight - content.scrollTop - content.clientHeight;
    if (distanceFromBottom < 400) {
      loadMore();
    }
  }, [loadMore]);

  // Attach scroll listener — depends on loadingSubs so it runs after sc-content is in the DOM
  useEffect(() => {
    if (loadingSubs) return;
    const content = contentRef.current;
    if (!content) return;
    content.addEventListener('scroll', checkAndLoadMore, { passive: true });
    return () => content.removeEventListener('scroll', checkAndLoadMore);
  }, [checkAndLoadMore, loadingSubs]);

  // After each page finishes loading, auto-load more if container isn't full yet
  // Also depends on loadingSubs so it doesn't fire before sc-content exists
  useEffect(() => {
    if (loadingSubs) return;
    if (!loadingProducts && !loadingMore) {
      checkAndLoadMore();
    }
  }, [loadingProducts, loadingMore, checkAndLoadMore, loadingSubs]);

  // Fetch page 1 — only after subs have loaded (sc-content is now in DOM)
  useEffect(() => {
    if (loadingSubs) return;

    pageRef.current = 1;
    hasMoreRef.current = false;
    isFetchingRef.current = false;
    setHasMore(false);
    setProducts([]);
    setLoadingProducts(true);

    const fetchPage1 = async () => {
      try {
        const res = await getProducts(buildParams(1, activeSub));
        setProducts(res.data.data);
        const p = res.data.pagination;
        const more = p && p.page < p.pages;
        hasMoreRef.current = more;
        setHasMore(more);
      } catch (err) {
        console.error('Failed to load products:', err);
      } finally {
        setLoadingProducts(false);
      }
    };

    fetchPage1();
  }, [activeSub, buildParams, loadingSubs]);

  const handleProductUpdate = useCallback((updatedProduct) => {
    setProducts(prev =>
      prev.map(p => p._id === updatedProduct._id ? { ...p, ...updatedProduct } : p)
    );
  }, []);
  useShopSocket(handleProductUpdate);

  const activeTitle = activeSub === ALL_TAB ? (categoryName || 'All Products') : activeSub.name;

  if (loadingSubs) return <Loader text="Loading..." />;

  return (
    <div className="sc-page">
      <div className="sc-top-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div className="sc-top-title">
          <h2>{categoryName || 'Category'}</h2>
        </div>
      </div>

      <div className="sc-layout">
        {/* Left sidebar */}
        <div className="sc-sidebar">
          <div
            className={`sc-sidebar-item ${activeSub === ALL_TAB ? 'active' : ''}`}
            onClick={() => setActiveSub(ALL_TAB)}
          >
            <div className="sc-sidebar-img-wrap">
              <span className="sc-sidebar-icon">🛒</span>
            </div>
            <span className="sc-sidebar-name">All</span>
          </div>

          {subCategories.map((sub) => (
            <div
              key={sub._id}
              className={`sc-sidebar-item ${activeSub !== ALL_TAB && activeSub?._id === sub._id ? 'active' : ''}`}
              onClick={() => setActiveSub(sub)}
            >
              <div className="sc-sidebar-img-wrap">
                {sub.image ? (
                  <img src={sub.image} alt={sub.name} className="sc-sidebar-img" loading="lazy" />
                ) : (
                  <span className="sc-sidebar-icon">{sub.icon}</span>
                )}
              </div>
              <span className="sc-sidebar-name">{sub.name}</span>
            </div>
          ))}
        </div>

        {/* Right content — scrollable container */}
        <div className="sc-content" ref={contentRef}>
          <div className="sc-content-header">
            <h3 className="sc-content-title">{activeTitle}</h3>
          </div>

          {loadingProducts ? (
            <div className="sc-content-loader"><div className="loader-spinner" /></div>
          ) : products.length === 0 ? (
            <div className="sc-empty">
              <span>🔍</span>
              <p>No products yet in this section</p>
            </div>
          ) : (
            <div className="sc-product-grid">
              {products.map((product) => (
                <ProductCard key={product._id} product={product} />
              ))}
            </div>
          )}

          {loadingMore && (
            <div className="infinite-scroll-loader">
              <div className="loader-spinner" />
            </div>
          )}
          {!loadingProducts && !hasMore && products.length > 0 && (
            <p className="infinite-scroll-end">All products loaded</p>
          )}
        </div>
      </div>

      <CartBar />
    </div>
  );
};

export default SubCategoryPage;
