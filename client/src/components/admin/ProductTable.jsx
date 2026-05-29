import { formatPrice } from '../../utils/formatters';
import { Pencil, Trash2 } from 'lucide-react';

const SKELETON_ROWS = 8;

export const ProductTableSkeleton = () => (
  <div className="product-table">
    <div className="table-header product-table-header">
      <span />
      <span>Name</span>
      <span>Category</span>
      <span>Price</span>
      <span>Stock</span>
      <span>In Stock</span>
      <span>Actions</span>
    </div>
    {Array.from({ length: SKELETON_ROWS }).map((_, i) => (
      <div key={i} className="table-row product-table-row product-skeleton-row">
        <span className="sk-cell sk-xs" />
        <span className="sk-cell sk-lg" />
        <span className="sk-cell sk-md" />
        <span className="sk-cell sk-sm" />
        <span className="sk-cell sk-sm" />
        <span className="sk-cell sk-sm" />
        <span className="sk-cell sk-sm" />
      </div>
    ))}
  </div>
);

const ProductTable = ({
  products,
  onEdit,
  onDelete,
  onToggleStock,
  selectedIds,
  onToggleSelect,
  onSelectAll,
}) => {
  if (!products.length) {
    return <div className="empty-state"><p>No products found</p></div>;
  }

  const allSelected = products.length > 0 && products.every((p) => selectedIds.has(p._id));
  const someSelected = products.some((p) => selectedIds.has(p._id));

  return (
    <div className="product-table">
      <div className="table-header product-table-header">
        <span>
          <input
            type="checkbox"
            className="product-select-cb"
            checked={allSelected}
            ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected; }}
            onChange={() => onSelectAll(allSelected ? [] : products.map((p) => p._id))}
            aria-label="Select all"
          />
        </span>
        <span>Name</span>
        <span>Category</span>
        <span>Price</span>
        <span>Stock</span>
        <span>In Stock</span>
        <span>Actions</span>
      </div>
      {products.map((p) => (
        <div
          key={p._id}
          className={`table-row product-table-row${selectedIds.has(p._id) ? ' row-selected' : ''}`}
        >
          <span onClick={(e) => e.stopPropagation()}>
            <input
              type="checkbox"
              className="product-select-cb"
              checked={selectedIds.has(p._id)}
              onChange={() => onToggleSelect(p._id)}
              aria-label={`Select ${p.name}`}
            />
          </span>
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
