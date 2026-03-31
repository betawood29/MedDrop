// Global search overlay — full-screen search accessible from any page
// Debounced input, instant results, category chips, product rows with add-to-cart

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowLeft, Plus, Minus, ChevronRight } from 'lucide-react';
import { searchProducts } from '../../services/productService';
import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../utils/formatters';

const POPULAR_SEARCHES = ['Dolo', 'Crocin', 'Band-Aid', 'Sanitizer', 'Protein', 'Notebook', 'Chips'];

const GlobalSearch = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  // Auto-focus input on mount
  useEffect(() => {
    inputRef.current?.focus();
    // Prevent body scroll
    document.body.style.overflow = 'hidden';
    return () => { document.body.style.overflow = ''; };
  }, []);

  // Debounced search
  useEffect(() => {
    clearTimeout(timerRef.current);
    if (!query.trim()) {
      setResults([]);
      setSuggestions([]);
      setSearched(false);
      return;
    }
    timerRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const res = await searchProducts(query.trim(), 30);
        const data = res.data.data;
        setResults(data.products || []);
        setSuggestions(data.suggestions || []);
        setSearched(true);
      } catch {
        setResults([]);
      } finally {
        setLoading(false);
      }
    }, 300);
    return () => clearTimeout(timerRef.current);
  }, [query]);

  const handleProductClick = (id) => {
    onClose();
    navigate(`/product/${id}`);
  };

  const handleCategoryClick = (slug) => {
    onClose();
    navigate(`/category/${slug}`);
  };

  const handlePopularClick = (term) => {
    setQuery(term);
  };

  return (
    <div className="gs-overlay">
      {/* Search header */}
      <div className="gs-header">
        <button className="gs-back" onClick={onClose}>
          <ArrowLeft size={22} />
        </button>
        <div className="gs-input-wrap">
          <Search size={18} className="gs-input-icon" />
          <input
            ref={inputRef}
            type="text"
            className="gs-input"
            placeholder="Search for medicines, snacks, essentials..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          {query && (
            <button className="gs-clear" onClick={() => setQuery('')}>
              <X size={16} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="gs-body">
        {/* No query — show popular searches */}
        {!query.trim() && (
          <div className="gs-section">
            <h4 className="gs-section-title">Popular Searches</h4>
            <div className="gs-popular">
              {POPULAR_SEARCHES.map((term) => (
                <button key={term} className="gs-popular-chip" onClick={() => handlePopularClick(term)}>
                  <Search size={13} /> {term}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div className="gs-loading">
            <div className="loader-spinner" />
          </div>
        )}

        {/* Category suggestions */}
        {!loading && suggestions.length > 0 && (
          <div className="gs-section">
            <h4 className="gs-section-title">Categories</h4>
            <div className="gs-cat-chips">
              {suggestions.map((cat) => (
                <button key={cat._id} className="gs-cat-chip" onClick={() => handleCategoryClick(cat.slug)}>
                  {cat.image ? (
                    <img src={cat.image} alt="" className="gs-cat-chip-img" />
                  ) : cat.icon ? (
                    <span className="gs-cat-chip-icon">{cat.icon}</span>
                  ) : null}
                  {cat.name}
                  <span className="gs-cat-count">{cat.count}</span>
                  <ChevronRight size={14} />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Product results */}
        {!loading && searched && results.length === 0 && (
          <div className="gs-empty">
            <span>🔍</span>
            <p>No products found for "{query}"</p>
          </div>
        )}

        {!loading && results.length > 0 && (
          <div className="gs-section">
            <h4 className="gs-section-title">{results.length} result{results.length !== 1 ? 's' : ''}</h4>
            <div className="gs-results">
              {results.map((product) => (
                <SearchResultRow
                  key={product._id}
                  product={product}
                  onClick={() => handleProductClick(product._id)}
                />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

// Compact product row for search results
const SearchResultRow = ({ product, onClick }) => {
  const { items, addItem, updateQty } = useCart();
  const cartItem = items.find((i) => i.product === product._id);
  const qty = cartItem?.quantity || 0;

  const discount = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <div className="gs-row">
      <div className="gs-row-img" onClick={onClick}>
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" />
        ) : (
          <span className="gs-row-placeholder">{product.category?.icon || '📦'}</span>
        )}
        {!product.inStock && <div className="gs-row-oos">OOS</div>}
      </div>

      <div className="gs-row-info" onClick={onClick}>
        <span className="gs-row-name">{product.name}</span>
        {product.description && <span className="gs-row-desc">{product.description}</span>}
        <div className="gs-row-pricing">
          <span className="gs-row-price">{formatPrice(product.price)}</span>
          {product.mrp && product.mrp > product.price && (
            <span className="gs-row-mrp">{formatPrice(product.mrp)}</span>
          )}
          {discount > 0 && <span className="gs-row-discount">{discount}% off</span>}
        </div>
      </div>

      <div className="gs-row-action">
        {!product.inStock ? (
          <span className="gs-row-unavail">—</span>
        ) : qty === 0 ? (
          <button className="gs-row-add" onClick={() => addItem(product)}>ADD</button>
        ) : (
          <div className="gs-row-qty">
            <button onClick={() => updateQty(product._id, qty - 1)}><Minus size={12} /></button>
            <span>{qty}</span>
            <button onClick={() => updateQty(product._id, qty + 1)}><Plus size={12} /></button>
          </div>
        )}
      </div>
    </div>
  );
};

export default GlobalSearch;
