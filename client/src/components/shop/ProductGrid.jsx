// Product grid — renders products in a responsive grid layout

import ProductCard from './ProductCard';
import Loader from '../common/Loader';

const ProductGrid = ({ products, loading }) => {
  if (loading) return <Loader text="Loading products..." />;

  if (!products || products.length === 0) {
    return (
      <div className="empty-state">
        <span className="empty-icon">🔍</span>
        <p>No products found</p>
      </div>
    );
  }

  return (
    <div className="product-grid">
      {products.map((product) => (
        <ProductCard key={product._id} product={product} />
      ))}
    </div>
  );
};

export default ProductGrid;
