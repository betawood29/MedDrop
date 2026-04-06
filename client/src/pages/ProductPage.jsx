// Product detail page — Blinkit-style full product view with suggested products

import { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeft, Plus, Minus, Clock, ShieldCheck, Tag, Package, ChevronRight } from 'lucide-react';
import { useCart } from '../hooks/useCart';
import { getProduct, getProducts } from '../services/productService';
import { formatPrice } from '../utils/formatters';
import { getDeliveryInfo } from '../utils/constants';
import ProductGrid from '../components/shop/ProductGrid';
import CartBar from '../components/shop/CartBar';
import Loader from '../components/common/Loader';

const ProductPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { items, addItem, updateQty } = useCart();

  const [product, setProduct] = useState(null);
  const [suggested, setSuggested] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [imgLoaded, setImgLoaded] = useState(false);

  const cartItem = items.find((i) => i.product === product?._id);
  const qty = cartItem?.quantity || 0;
  const maxQty = product?.stockQty > 0 ? product.stockQty : Infinity;
  const atMax = qty >= maxQty;

  const discount = product?.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  useEffect(() => {
    setLoading(true);
    setImgLoaded(false);
    setError('');
    getProduct(id)
      .then((res) => {
        setProduct(res.data.data);
        // Fetch suggested products from same category
        const catSlug = res.data.data.category?.slug;
        if (catSlug) {
          return getProducts({ category: catSlug, limit: 10 });
        }
      })
      .then((res) => {
        if (res) {
          // Filter out current product
          setSuggested(res.data.data.filter((p) => p._id !== id));
        }
      })
      .catch(() => setError('Product not found'))
      .finally(() => setLoading(false));
  }, [id]);

  if (loading) return <Loader text="Loading product..." />;
  if (error) return (
    <div className="page-container">
      <div className="empty-state">
        <span className="empty-icon">😕</span>
        <h3>{error}</h3>
        <button className="btn-add" onClick={() => navigate(-1)}>Go Back</button>
      </div>
    </div>
  );
  if (!product) return null;

  return (
    <div className="pdp">
      {/* Header */}
      <div className="pdp-header">
        <button className="pdp-back" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <span className="pdp-category-link" onClick={() => navigate(`/category/${product.category?.slug || 'all'}`)}>
          {product.category?.name || 'Products'} <ChevronRight size={14} />
        </span>
      </div>

      {/* Image */}
      <div className="pdp-image-section">
        {discount > 0 && (
          <div className="pdp-discount-badge">{discount}% OFF</div>
        )}
        {product.requiresPrescription && (
          <div className="pdp-rx-badge">Rx Required</div>
        )}
        <div className={`pdp-image-wrap ${imgLoaded ? 'loaded' : ''}`}>
          {product.image ? (
            <img
              src={product.image}
              alt={product.name}
              onLoad={() => setImgLoaded(true)}
            />
          ) : (
            <div className="pdp-image-placeholder">
              {product.category?.icon || '📦'}
            </div>
          )}
        </div>
        {!product.inStock && <div className="pdp-oos-overlay">Out of Stock</div>}
      </div>

      {/* Info */}
      <div className="pdp-info">
        <div className="pdp-delivery-tag">
          <Clock size={12} />
          <span>{getDeliveryInfo().label}</span>
        </div>

        <h1 className="pdp-name">{product.name}</h1>

        {product.description && (
          <p className="pdp-description">{product.description}</p>
        )}

        {/* Price + Add */}
        <div className="pdp-price-row">
          <div className="pdp-pricing">
            <span className="pdp-price">{formatPrice(product.price)}</span>
            {product.mrp && product.mrp > product.price && (
              <span className="pdp-mrp">{formatPrice(product.mrp)}</span>
            )}
            {discount > 0 && (
              <span className="pdp-save">You save {formatPrice(product.mrp - product.price)}</span>
            )}
          </div>
          <div className="pdp-action">
            {!product.inStock ? (
              <span className="pdp-oos-text">Currently Unavailable</span>
            ) : qty === 0 ? (
              <button className="pdp-add-btn" onClick={() => addItem(product)}>
                <Plus size={16} /> ADD
              </button>
            ) : (
              <div className="pdp-qty-control">
                <button onClick={() => updateQty(product._id, qty - 1)}><Minus size={16} /></button>
                <span>{qty}</span>
                <button onClick={() => updateQty(product._id, qty + 1)} disabled={atMax} className={atMax ? 'qty-btn-disabled' : ''}><Plus size={16} /></button>
              </div>
            )}
          </div>
        </div>

        {/* Details chips */}
        <div className="pdp-details">
          {product.stockQty > 0 && product.inStock && (
            <div className={`pdp-chip ${product.stockQty <= 5 ? 'warning' : ''}`}>
              <Package size={14} />
              <span>{product.stockQty <= 5 ? `Only ${product.stockQty} left!` : `${product.stockQty} in stock`}</span>
            </div>
          )}
          {product.requiresPrescription && (
            <div className="pdp-chip warning">
              <ShieldCheck size={14} />
              <span>Prescription required</span>
            </div>
          )}
          {product.tags?.length > 0 && (
            <div className="pdp-tags">
              {product.tags.map((tag, i) => (
                <span key={i} className="pdp-tag">
                  <Tag size={10} /> {tag}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Why MedDrop section */}
        <div className="pdp-why-section">
          <div className="pdp-why-item">
            <span className="pdp-why-icon">🚀</span>
            <div>
              <strong>Express Delivery</strong>
              <p>Delivered to your hostel gate</p>
            </div>
          </div>
          <div className="pdp-why-item">
            <span className="pdp-why-icon">✅</span>
            <div>
              <strong>Genuine Products</strong>
              <p>100% authentic & verified</p>
            </div>
          </div>
          <div className="pdp-why-item">
            <span className="pdp-why-icon">💰</span>
            <div>
              <strong>Best Prices</strong>
              <p>Campus-friendly pricing</p>
            </div>
          </div>
        </div>
      </div>

      {/* Suggested Products */}
      {suggested.length > 0 && (
        <div className="pdp-suggested">
          <div className="pdp-suggested-header">
            <h3>Similar Products</h3>
            <button className="see-all-btn" onClick={() => navigate(`/category/${product.category?.slug || 'all'}`)}>
              See all
            </button>
          </div>
          <ProductGrid products={suggested.slice(0, 6)} loading={false} />
        </div>
      )}

      <CartBar />
    </div>
  );
};

export default ProductPage;
