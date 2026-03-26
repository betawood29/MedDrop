// Admin product table — list products with edit, delete, stock toggle

import { formatPrice } from '../../utils/formatters';
import { Pencil, Trash2 } from 'lucide-react';

const ProductTable = ({ products, onEdit, onDelete, onToggleStock }) => {
  if (!products.length) {
    return <div className="empty-state"><p>No products found</p></div>;
  }

  return (
    <div className="product-table">
      <div className="table-header">
        <span>Name</span>
        <span>Category</span>
        <span>Price</span>
        <span>Stock</span>
        <span>In Stock</span>
        <span>Actions</span>
      </div>
      {products.map((p) => (
        <div key={p._id} className="table-row">
          <span className="product-name-cell">{p.name}</span>
          <span>{p.category?.name || '—'}</span>
          <span>{formatPrice(p.price)}</span>
          <span>{p.stockQty}</span>
          <span>
            <label className="toggle">
              <input
                type="checkbox"
                checked={p.inStock}
                onChange={() => onToggleStock(p._id, !p.inStock)}
              />
              <span className="toggle-slider" />
            </label>
          </span>
          <span className="action-btns">
            <button className="icon-btn-sm" onClick={() => onEdit(p)} aria-label="Edit"><Pencil size={16} /></button>
            <button className="icon-btn-sm danger" onClick={() => onDelete(p._id)} aria-label="Delete"><Trash2 size={16} /></button>
          </span>
        </div>
      ))}
    </div>
  );
};

export default ProductTable;
