// Admin categories page — manage categories and subcategories

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import CategoryManager from '../../components/admin/CategoryManager';
import SubCategoryManager from '../../components/admin/SubCategoryManager';
import Loader from '../../components/common/Loader';
import {
  getAdminCategories, createCategory, updateCategory, deleteCategory,
  getAdminSubCategories, createSubCategory, updateSubCategory, deleteSubCategory,
} from '../../services/adminService';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
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

  const fetchSubCategories = async () => {
    try {
      const res = await getAdminSubCategories();
      setSubCategories(res.data.data || []);
    } catch {
      // ignore
    }
  };

  useEffect(() => {
    fetchCategories();
    fetchSubCategories();
  }, []);

  // Category handlers
  const handleCreateCat = async (data) => {
    try {
      await createCategory(data);
      toast.success('Category created!');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    }
  };

  const handleUpdateCat = async (id, data) => {
    try {
      await updateCategory(id, data);
      toast.success('Category updated!');
      fetchCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleDeleteCat = async (id) => {
    if (!window.confirm('Delete this category?')) return;
    try {
      await deleteCategory(id);
      toast.success('Category deleted');
      fetchCategories();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  // SubCategory handlers
  const handleCreateSub = async (data) => {
    try {
      await createSubCategory(data);
      toast.success('Sub-category created!');
      fetchSubCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to create');
    }
  };

  const handleUpdateSub = async (id, data) => {
    try {
      await updateSubCategory(id, data);
      toast.success('Sub-category updated!');
      fetchSubCategories();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    }
  };

  const handleDeleteSub = async (id) => {
    if (!window.confirm('Delete this sub-category?')) return;
    try {
      await deleteSubCategory(id);
      toast.success('Sub-category deleted');
      fetchSubCategories();
    } catch (err) {
      toast.error('Failed to delete');
    }
  };

  if (loading) return <Loader />;

  return (
    <div className="admin-page">
      <CategoryManager
        categories={categories}
        onCreate={handleCreateCat}
        onUpdate={handleUpdateCat}
        onDelete={handleDeleteCat}
      />
      <SubCategoryManager
        subCategories={subCategories}
        categories={categories}
        onCreate={handleCreateSub}
        onUpdate={handleUpdateSub}
        onDelete={handleDeleteSub}
      />
    </div>
  );
};

export default AdminCategories;
