// Admin categories page — manage product categories

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import CategoryManager from '../../components/admin/CategoryManager';
import Loader from '../../components/common/Loader';
import { getAdminCategories, createCategory, updateCategory, deleteCategory } from '../../services/adminService';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [loading, setLoading] = useState(true);

  const fetchCategories = async () => {
    try {
      const res = await getAdminCategories();
      setCategories(res.data.data);
    } catch (err) {
      toast.error('Failed to load categories');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchCategories(); }, []);

  const handleCreate = async (data) => {
    try {
      await createCategory(data);
      toast.success('Category created!');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    }
  };

  const handleUpdate = async (id, data) => {
    try {
      await updateCategory(id, data);
      toast.success('Category updated!');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await deleteCategory(id);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="admin-page">
      <CategoryManager
        categories={categories}
        onCreate={handleCreate}
        onUpdate={handleUpdate}
        onDelete={handleDelete}
        loading={loading}
      />
    </div>
  );
};

export default AdminCategories;
