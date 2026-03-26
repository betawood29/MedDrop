// Search bar component — debounced search input for products

import { useState, useEffect, useRef } from 'react';
import { Search, X } from 'lucide-react';

const SearchBar = ({ onSearch, placeholder = 'Search medicines, snacks...' }) => {
  const [query, setQuery] = useState('');
  const timerRef = useRef(null);

  useEffect(() => {
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => {
      onSearch(query.trim());
    }, 400);
    return () => clearTimeout(timerRef.current);
  }, [query, onSearch]);

  return (
    <div className="search-bar">
      <Search size={18} className="search-icon" />
      <input
        type="text"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={placeholder}
        className="search-input"
      />
      {query && (
        <button className="search-clear" onClick={() => setQuery('')} aria-label="Clear search">
          <X size={16} />
        </button>
      )}
    </div>
  );
};

export default SearchBar;
