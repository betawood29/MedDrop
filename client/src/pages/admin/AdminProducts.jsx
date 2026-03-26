// Admin products page — full product CRUD with search

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import { Plus, Search, Package } from 'lucide-react';
import ProductTable from '../../components/admin/ProductTable';
import ProductForm from '../../components/admin/ProductForm';
import Loader from '../../components/common/Loader';
import { getAdminProducts, createProduct, updateProduct, patchProduct, deleteProduct, getAdminCategories } from '../../services/adminService';
import { useAdminSocket } from '../../hooks/useSocket';

const AdminProducts = () => {
  const [products, setProducts] = useState([]);
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [formLoading, setFormLoading] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [editProduct, setEditProduct] = useState(null);
  const [search, setSearch] = useState('');

  // Initial load + search — only shows loader on first load
  const fetchProducts = async (showLoader = false) => {
    if (showLoader) setLoading(true);
    try {
      const params = search ? { search } : {};
      const [prodRes, catRes] = await Promise.all([
        getAdminProducts(params),
        getAdminCategories(),
      ]);
      setProducts(prodRes.data.data);
      setCategories(catRes.data.data);
    } catch (err) {
      toast.error('Failed to load products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchProducts(true); }, [search]);

  // Real-time: when any product is updated (from another admin tab, or from user order)
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
      fetchProducts();
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
      // Socket will handle the live update, but also refresh for full data
      fetchProducts();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally {
      setFormLoading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this product?')) return;
    try {
      await deleteProduct(id);
      toast.success('Product deleted');
      fetchProducts();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  const handleToggleStock = async (id, inStock) => {
    // Optimistic update — flip immediately in UI
    setProducts((prev) =>
      prev.map((p) => (p._id === id ? { ...p, inStock } : p))
    );
    try {
      await patchProduct(id, { inStock });
      // Socket will push the confirmed state back
    } catch (err) {
      // Revert on failure
      setProducts((prev) =>
        prev.map((p) => (p._id === id ? { ...p, inStock: !inStock } : p))
      );
      toast.error('Failed to update stock');
    }
  };

  return (
    <div className="admin-page">
      <div className="admin-products-header">
        <div className="admin-products-title">
          <Package size={22} />
          <h2>Products</h2>
          <span className="admin-count-badge">{products.length}</span>
        </div>
        <button className="btn-add-product" onClick={() => { setEditProduct(null); setShowForm(true); }}>
          <Plus size={16} /> Add Product
        </button>
      </div>

      <div className="admin-search-bar">
        <Search size={16} className="admin-search-icon" />
        <input
          className="admin-search-input"
          placeholder="Search products..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {loading ? <Loader /> : (
        <ProductTable
          products={products}
          onEdit={(p) => { setEditProduct(p); setShowForm(true); }}
          onDelete={handleDelete}
          onToggleStock={handleToggleStock}
        />
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
    </div>
  );
};

export default AdminProducts;
