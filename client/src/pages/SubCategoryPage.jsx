// SubCategory page — Blinkit-style sidebar layout
// Left: vertical scrollable subcategory list with icons/images
// Right: products grid for the active subcategory
// URL: /category/:slug/sub

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import ProductCard from '../components/shop/ProductCard';
import CartBar from '../components/shop/CartBar';
import Loader from '../components/common/Loader';
import { getSubCategories, getProducts } from '../services/productService';
import { useShopSocket } from '../hooks/useSocket';

const SubCategoryPage = () => {
  const { slug } = useParams();
  const navigate = useNavigate();
  const [subCategories, setSubCategories] = useState([]);
  const [activeSub, setActiveSub] = useState(null);
  const [products, setProducts] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(true);
  const [loadingProducts, setLoadingProducts] = useState(false);
  const [categoryName, setCategoryName] = useState('');

  // Load subcategories and auto-select first
  useEffect(() => {
    const load = async () => {
      setLoadingSubs(true);
      try {
        const res = await getSubCategories({ category: slug });
        const subs = res.data.data || [];
        setSubCategories(subs);
        if (subs.length > 0) {
          if (subs[0].parentCategory?.name) setCategoryName(subs[0].parentCategory.name);
          setActiveSub(subs[0]);
        }
      } catch (err) {
        console.error('Failed to load subcategories:', err);
      } finally {
        setLoadingSubs(false);
      }
    };
    load();
  }, [slug]);

  // Fetch products when active subcategory changes
  const fetchProducts = useCallback(async () => {
    if (!activeSub) return;
    setLoadingProducts(true);
    try {
      const res = await getProducts({ subCategory: activeSub.slug, limit: 50 });
      setProducts(res.data.data);
    } catch (err) {
      console.error('Failed to load products:', err);
    } finally {
      setLoadingProducts(false);
    }
  }, [activeSub]);

  useEffect(() => {
    if (activeSub) fetchProducts();
  }, [fetchProducts]);

  // Real-time product updates
  const handleProductUpdate = useCallback((updatedProduct) => {
    setProducts((prev) =>
      prev.map((p) => (p._id === updatedProduct._id ? { ...p, ...updatedProduct } : p))
    );
  }, []);
  useShopSocket(handleProductUpdate);

  const handleSelectSub = (sub) => {
    setActiveSub(sub);
  };

  if (loadingSubs) return <Loader text="Loading..." />;

  return (
    <div className="sc-page">
      {/* Sticky header */}
      <div className="sc-top-header">
        <button className="back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div className="sc-top-title">
          <h2>{categoryName || 'Category'}</h2>
        </div>
      </div>

      {/* Main layout: sidebar + products */}
      <div className="sc-layout">
        {/* Left sidebar */}
        <div className="sc-sidebar">
          {subCategories.map((sub) => (
            <div
              key={sub._id}
              className={`sc-sidebar-item ${activeSub?._id === sub._id ? 'active' : ''}`}
              onClick={() => handleSelectSub(sub)}
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

        {/* Right content — products */}
        <div className="sc-content">
          {activeSub && (
            <div className="sc-content-header">
              <h3 className="sc-content-title">{activeSub.name}</h3>
            </div>
          )}

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
        </div>
      </div>

      <CartBar />
    </div>
  );
};

export default SubCategoryPage;
