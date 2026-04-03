// Global search overlay — Blinkit-style full-screen search
// Autocomplete suggestions, recent searches, product grid results

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, X, ArrowLeft, Plus, Minus, ChevronRight } from 'lucide-react';
import { searchProducts } from '../../services/productService';
import { useCart } from '../../hooks/useCart';
import { formatPrice } from '../../utils/formatters';

const POPULAR_SEARCHES = ['Dolo', 'Crocin', 'Band-Aid', 'Sanitizer', 'Protein', 'Notebook', 'Chips'];
const RECENT_KEY = 'meddrop_recent_searches';
const MAX_RECENT = 8;

const getRecentSearches = () => {
  try { return JSON.parse(localStorage.getItem(RECENT_KEY)) || []; }
  catch { return []; }
};

const addRecentSearch = (term) => {
  const recent = getRecentSearches().filter((t) => t !== term);
  recent.unshift(term);
  localStorage.setItem(RECENT_KEY, JSON.stringify(recent.slice(0, MAX_RECENT)));
};

const clearRecentSearches = () => {
  localStorage.removeItem(RECENT_KEY);
};

const GlobalSearch = ({ onClose }) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [suggestions, setSuggestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [searched, setSearched] = useState(false);
  const [recentSearches, setRecentSearches] = useState(getRecentSearches());
  const inputRef = useRef(null);
  const timerRef = useRef(null);
  const navigate = useNavigate();

  useEffect(() => {
    inputRef.current?.focus();
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
        if (query.trim().length >= 2) addRecentSearch(query.trim());
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

  const handleClearRecent = () => {
    clearRecentSearches();
    setRecentSearches([]);
  };

  return (
    <div className="gs-overlay">
      {/* Search header — clean Blinkit-style */}
      <div className="gs-header">
        <button className="gs-back" onClick={onClose} aria-label="Close search">
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
            <button className="gs-clear" onClick={() => setQuery('')} aria-label="Clear">
              <X size={18} />
            </button>
          )}
        </div>
      </div>

      {/* Content */}
      <div className="gs-body">
        {/* No query — show recent + popular searches */}
        {!query.trim() && (
          <>
            {recentSearches.length > 0 && (
              <div className="gs-section">
                <div className="gs-section-header">
                  <h4 className="gs-section-title">Recent searches</h4>
                  <button className="gs-section-clear" onClick={handleClearRecent}>clear</button>
                </div>
                <div className="gs-popular">
                  {recentSearches.map((term) => (
                    <button key={term} className="gs-popular-chip" onClick={() => setQuery(term)}>
                      {term}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <div className="gs-section">
              <div className="gs-section-header">
                <h4 className="gs-section-title">Popular searches</h4>
              </div>
              <div className="gs-popular">
                {POPULAR_SEARCHES.map((term) => (
                  <button key={term} className="gs-popular-chip" onClick={() => setQuery(term)}>
                    <Search size={13} /> {term}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}

        {/* Loading */}
        {loading && (
          <div className="gs-loading">
            <div className="loader-spinner" />
          </div>
        )}

        {/* Category suggestions as rows */}
        {!loading && suggestions.length > 0 && (
          <div className="gs-suggestions">
            {suggestions.map((cat) => (
              <div key={cat._id} className="gs-suggestion-row" onClick={() => handleCategoryClick(cat.slug)}>
                <div className="gs-suggestion-img">
                  {cat.image ? (
                    <img src={cat.image} alt="" />
                  ) : cat.icon ? (
                    <span className="gs-suggestion-icon">{cat.icon}</span>
                  ) : (
                    <Search size={16} />
                  )}
                </div>
                <span className="gs-suggestion-text">{cat.name}</span>
                <ChevronRight size={16} style={{ color: 'var(--text-muted)', marginLeft: 'auto' }} />
              </div>
            ))}
          </div>
        )}

        {/* No results */}
        {!loading && searched && results.length === 0 && (
          <div className="gs-empty">
            <span>🔍</span>
            <p>No products found for "{query}"</p>
          </div>
        )}

        {/* Product results as grid cards */}
        {!loading && results.length > 0 && (
          <div className="gs-section">
            <div className="gs-results-label">
              Showing results for "{query}"
            </div>
            <div className="gs-results-grid">
              {results.map((product) => (
                <SearchResultCard
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

// Product card for search results grid
const SearchResultCard = ({ product, onClick }) => {
  const { items, addItem, updateQty } = useCart();
  const cartItem = items.find((i) => i.product === product._id);
  const qty = cartItem?.quantity || 0;
  const maxQty = product.stockQty > 0 ? product.stockQty : Infinity;
  const atMax = qty >= maxQty;

  const discount = product.mrp && product.mrp > product.price
    ? Math.round(((product.mrp - product.price) / product.mrp) * 100)
    : 0;

  return (
    <div className="gs-result-card">
      <div className="gs-result-card-img" onClick={onClick}>
        {product.image ? (
          <img src={product.image} alt={product.name} loading="lazy" />
        ) : (
          <span className="gs-result-card-placeholder">{product.category?.icon || '📦'}</span>
        )}
        {!product.inStock && <div className="gs-result-card-oos">Out of Stock</div>}
        {discount > 0 && <div className="gs-result-card-discount">{discount}% OFF</div>}
      </div>
      <div className="gs-result-card-info">
        <div className="gs-result-card-name" onClick={onClick} style={{ cursor: 'pointer' }}>
          {product.name}
        </div>
        {product.description && <div className="gs-result-card-desc">{product.description}</div>}
        <div className="gs-result-card-bottom">
          <div className="gs-result-card-pricing">
            <span className="gs-result-card-price">{formatPrice(product.price)}</span>
            {product.mrp && product.mrp > product.price && (
              <span className="gs-result-card-mrp">{formatPrice(product.mrp)}</span>
            )}
          </div>
          <div className="gs-result-card-action">
            {!product.inStock ? (
              <span className="gs-result-unavail">—</span>
            ) : qty === 0 ? (
              <button className="btn-add" onClick={() => addItem(product)}>ADD</button>
            ) : (
              <div className="qty-control">
                <button onClick={() => updateQty(product._id, qty - 1)} aria-label="Decrease"><Minus size={12} /></button>
                <span>{qty}</span>
                <button onClick={() => updateQty(product._id, qty + 1)} aria-label="Increase" disabled={atMax} className={atMax ? 'qty-btn-disabled' : ''}><Plus size={12} /></button>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default GlobalSearch;
