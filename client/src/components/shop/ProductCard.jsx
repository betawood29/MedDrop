// Product card — Blinkit-style compact card with image, price, and quick add button

import { useNavigate } from 'react-router-dom';
import { Plus, Minus } from 'lucide-react';
import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../utils/formatters';

const ProductCard = ({ product }) => {
  const navigate = useNavigate();
  const { items, addItem, updateQty } = useCart();
  const cartItem = items.find((i) => i.product === product._id);
  const qty = cartItem?.quantity || 0;

  const discount = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  const goToProduct = () => navigate(`/product/${product._id}`);

  return (
    <div className="product-card">
      {discount > 0 && (
        <div className="discount-badge">{discount}% OFF</div>
      )}

      <div className="product-image" onClick={goToProduct} style={{ cursor: 'pointer' }}>
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" />
        ) : (
          <div className="product-image-placeholder">{product.category?.icon || '📦'}</div>
        )}
        {product.requiresPrescription && (
          <span className="prescription-badge">Rx</span>
        )}
        {!product.inStock && <div className="out-of-stock-overlay">Out of Stock</div>}
      </div>

      <div className="product-info">
        <div className="product-delivery-time">15-30 MINS</div>
        <h3 className="product-name" onClick={goToProduct} style={{ cursor: 'pointer' }}>{product.name}</h3>
        {product.description && <p className="product-desc">{product.description}</p>}

        <div className="product-bottom">
          <div className="product-pricing">
            <span className="product-price">{formatPrice(product.price)}</span>
            {product.mrp && product.mrp > product.price && (
              <span className="product-mrp">{formatPrice(product.mrp)}</span>
            )}
          </div>

          <div className="product-action">
            {!product.inStock ? (
              <span className="out-of-stock-text">Unavailable</span>
            ) : qty === 0 ? (
              <button className="btn-add" onClick={() => addItem(product)}>ADD</button>
            ) : (
              <div className="qty-control">
                <button onClick={() => updateQty(product._id, qty - 1)} aria-label="Decrease"><Minus size={14} /></button>
                <span>{qty}</span>
                <button onClick={() => updateQty(product._id, qty + 1)} aria-label="Increase"><Plus size={14} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProductCard;
