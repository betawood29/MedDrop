import { useState, useEffect, useCallback, useRef } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, Package, ChevronLeft, ChevronRight, Trash2 } from 'lucide-react';
import ProductTable, { ProductTableSkeleton } from '../../components/admin/ProductTable';
import ProductForm from '../../components/admin/ProductForm';
import ConfirmModal from '../../components/common/ConfirmModal';
import { getAdminProducts, createProduct, updateProduct, patchProduct, deleteProduct, bulkDeleteProducts, getAdminCategories } from '../../services/adminService';
import { useAdminSocket } from '../../hooks/useSocket';

const PAGE_LIMIT = 20;

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);

  // Search with debounce
  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  useEffect(() => {
    const t = setTimeout(() => setDebouncedSearch(search), 400);
    return () => clearTimeout(t);
  }, [search]);

  // Category filter
  const [categoryFilter, setCategoryFilter] = useState('');

  // Pagination
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(0);

  // Selection
  const [selectedIds, setSelectedIds] = useState(new Set());
  const [selectAllProducts, setSelectAllProducts] = useState(false); // select across all pages

  // Confirm modals
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null });
  const [bulkConfirm, setBulkConfirm] = useState(false);

  const fetchProducts = useCallback(async (pg = page, showLoader = true) => {
    if (showLoader) setLoading(true);
    try {
      const params = { page: pg, limit: PAGE_LIMIT };
      if (debouncedSearch) params.search = debouncedSearch;
      if (categoryFilter) params.category = categoryFilter;
      const [prodRes, catRes] = await Promise.all([
        getAdminProducts(params),
        getAdminCategories(),
      ]);
      setProducts(prodRes.data.data);
      setTotalPages(prodRes.data.pagination?.pages || 1);
      setTotalCount(prodRes.data.pagination?.total || 0);
      setCategories(catRes.data.data);
    } catch {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  }, [debouncedSearch, categoryFilter, page]);

  // Reset to page 1 when search or category filter changes
  const mounted = useRef(false);
  useEffect(() => {
    if (!mounted.current) { mounted.current = true; return; }
    setPage(1);
    setSelectedIds(new Set());
    setSelectAllProducts(false);
  }, [debouncedSearch, categoryFilter]);

  // Fetch when page changes (also covers initial load)
  useEffect(() => {
    fetchProducts(page, true);
  }, [page, debouncedSearch, categoryFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  // Real-time socket updates
  const handleSocketProductUpdate = useCallback((updated) => {
    setProducts((prev) =>
      prev.map((p) => (p._id === updated._id ? { ...p, ...updated } : p))
    );
  }, []);
  useAdminSocket(null, handleSocketProductUpdate);

  const handleCreate = async (data) => {
    setFormLoading(true);
    try {
      await createProduct(data);
      toast.success('Product created!');
      setShowForm(false);
      fetchProducts(page, false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    } finally {
      setFormLoading(false);
    }
  };

  const handleUpdate = async (data) => {
    setFormLoading(true);
    try {
      await updateProduct(editProduct._id, data);
      toast.success('Product updated!');
      setEditProduct(null);
      setShowForm(false);
      fetchProducts(page, false);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = (id) => setDeleteConfirm({ open: true, id });

  const confirmDelete = async () => {
    const id = deleteConfirm.id;
    setDeleteConfirm({ open: false, id: null });
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
      setProducts((prev) => prev.filter((p) => p._id !== id));
      setSelectedIds((prev) => { const s = new Set(prev); s.delete(id); return s; });
      setTotalCount((c) => c - 1);
    } catch {
      toast.error('Failed to delete');
    }
  };

  const handleToggleStock = async (id, inStock) => {
    setProducts((prev) => prev.map((p) => (p._id === id ? { ...p, inStock } : p)));
    try {
      await patchProduct(id, { inStock });
    } catch {
      setProducts((prev) => prev.map((p) => (p._id === id ? { ...p, inStock: !inStock } : p)));
      toast.error('Failed to update stock');
    }
  };

  // Selection handlers
  const handleToggleSelect = (id) => {
    setSelectAllProducts(false);
    setSelectedIds((prev) => {
      const s = new Set(prev);
      s.has(id) ? s.delete(id) : s.add(id);
      return s;
    });
  };

  const handleSelectAll = (ids) => {
    setSelectAllProducts(false);
    setSelectedIds(new Set(ids));
  };

  const handleBulkDelete = () => setBulkConfirm(true);

  const confirmBulkDelete = async () => {
    setBulkConfirm(false);
    const isAll = selectAllProducts;
    const ids = isAll ? [] : [...selectedIds];
    try {
      await bulkDeleteProducts(ids, isAll);
      const count = isAll ? totalCount : ids.length;
      toast.success(`${count} product${count !== 1 ? 's' : ''} deleted`);
      setSelectedIds(new Set());
      setSelectAllProducts(false);
      // If deleting all on current page and not the last page, go to page 1
      if (isAll) {
        setPage(1);
        setTotalCount(0);
        setProducts([]);
      } else {
        setProducts((prev) => prev.filter((p) => !ids.includes(p._id)));
        setTotalCount((c) => c - ids.length);
      }
    } catch {
      toast.error('Bulk delete failed');
    }
  };

  const selectedCount = selectAllProducts ? totalCount : selectedIds.size;
  const allOnPageSelected = products.length > 0 && products.every((p) => selectedIds.has(p._id));

  const bulkConfirmMessage = selectAllProducts
    ? `All ${totalCount} products will be permanently removed from the store.`
    : `${selectedIds.size} selected product${selectedIds.size !== 1 ? 's' : ''} will be removed from the store.`;

  return (
    <div className="admin-page">
      <div className="admin-products-header">
        <div className="admin-products-title">
          <Package size={22} />
          <h2>Products</h2>
          <span className="admin-count-badge">{totalCount || products.length}</span>
        </div>
        <button className="btn-add-product" onClick={() => { setEditProduct(null); setShowForm(true); }}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="admin-search-bar">
        <div className="admin-search-input-wrap">
          <Search size={16} className="admin-search-icon" />
          <input
            className="admin-search-input"
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <select
          className="admin-category-filter"
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          aria-label="Filter by category"
        >
          <option value="">All Categories</option>
          {categories.map((c) => (
            <option key={c._id} value={c._id}>{c.name}</option>
          ))}
        </select>
      </div>

      {/* Bulk action bar */}
      {selectedCount > 0 && (
        <div className="bulk-action-bar">
          <span className="bulk-action-label">
            {selectAllProducts ? `All ${totalCount} products selected` : `${selectedIds.size} selected`}
          </span>
          {allOnPageSelected && !selectAllProducts && totalCount > products.length && (
            <button className="bulk-select-all-btn" onClick={() => setSelectAllProducts(true)}>
              Select all {totalCount} products
            </button>
          )}
          {selectAllProducts && (
            <button className="bulk-select-all-btn" onClick={() => { setSelectAllProducts(false); setSelectedIds(new Set()); }}>
              Clear selection
            </button>
          )}
          <button className="bulk-delete-btn" onClick={handleBulkDelete}>
            <Trash2 size={14} /> Delete {selectedCount > 1 ? `(${selectedCount})` : ''}
          </button>
        </div>
      )}

      {loading ? (
        <ProductTableSkeleton />
      ) : (
        <ProductTable
          products={products}
          onEdit={(p) => { setEditProduct(p); setShowForm(true); }}
          onDelete={handleDelete}
          onToggleStock={handleToggleStock}
          selectedIds={selectedIds}
          onToggleSelect={handleToggleSelect}
          onSelectAll={handleSelectAll}
        />
      )}

      {/* Pagination */}
      {!loading && totalPages > 1 && (
        <div className="product-pagination">
          <span className="pagination-info">
            {(page - 1) * PAGE_LIMIT + 1}–{Math.min(page * PAGE_LIMIT, totalCount)} of {totalCount}
          </span>
          <div className="pagination-controls">
            <button
              className="pagination-btn"
              disabled={page === 1}
              onClick={() => setPage((p) => p - 1)}
              aria-label="Previous page"
            >
              <ChevronLeft size={16} />
            </button>
            {Array.from({ length: totalPages }, (_, i) => i + 1)
              .filter((p) => p === 1 || p === totalPages || Math.abs(p - page) <= 1)
              .reduce((acc, p, idx, arr) => {
                if (idx > 0 && p - arr[idx - 1] > 1) acc.push('…');
                acc.push(p);
                return acc;
              }, [])
              .map((p, i) =>
                p === '…' ? (
                  <span key={`ellipsis-${i}`} className="pagination-ellipsis">…</span>
                ) : (
                  <button
                    key={p}
                    className={`pagination-btn${p === page ? ' active' : ''}`}
                    onClick={() => setPage(p)}
                  >
                    {p}
                  </button>
                )
              )}
            <button
              className="pagination-btn"
              disabled={page === totalPages}
              onClick={() => setPage((p) => p + 1)}
              aria-label="Next page"
            >
              <ChevronRight size={16} />
            </button>
          </div>
        </div>
      )}

      {showForm && (
        <ProductForm
          product={editProduct}
          categories={categories}
          onSubmit={editProduct ? handleUpdate : handleCreate}
          onClose={() => { setShowForm(false); setEditProduct(null); }}
          loading={formLoading}
        />
      )}

      <ConfirmModal
        isOpen={deleteConfirm.open}
        title="Delete Product"
        message="This product will be removed from the store. This action cannot be undone."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null })}
      />

      <ConfirmModal
        isOpen={bulkConfirm}
        title={selectAllProducts ? 'Delete All Products' : `Delete ${selectedIds.size} Products`}
        message={bulkConfirmMessage}
        confirmText="Delete"
        onConfirm={confirmBulkDelete}
        onCancel={() => setBulkConfirm(false)}
      />
    </div>
  );
};

export default AdminProducts;
