// Admin categories page — manage categories and subcategories

import { useState, useEffect } from 'react';
import toast from 'react-hot-toast';
import CategoryManager from '../../components/admin/CategoryManager';
import SubCategoryManager from '../../components/admin/SubCategoryManager';
import Loader from '../../components/common/Loader';
import ConfirmModal from '../../components/common/ConfirmModal';
import {
  getAdminCategories, createCategory, updateCategory, deleteCategory, toggleCategory,
  getAdminSubCategories, createSubCategory, updateSubCategory, deleteSubCategory,
} from '../../services/adminService';

const AdminCategories = () => {
  const [categories, setCategories] = useState([]);
  const [subCategories, setSubCategories] = useState([]);
  const [loading, setLoading] = useState(true);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, id: null, type: null });

  const fetchCategories = async () => {
    try {
      const res = await getAdminCategories();
      setCategories(res.data.data);
    } catch {
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

  const handleToggleCat = async (id) => {
    try {
      const res = await toggleCategory(id);
      toast.success(res.data.message);
      fetchCategories();
    } catch {
      toast.error('Failed to toggle category');
    }
  };

  const handleDeleteCat = (id) => {
    setDeleteConfirm({ open: true, id, type: 'category' });
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

  const handleDeleteSub = (id) => {
    setDeleteConfirm({ open: true, id, type: 'subcategory' });
  };

  const confirmDelete = async () => {
    const { id, type } = deleteConfirm;
    setDeleteConfirm({ open: false, id: null, type: null });
    try {
      if (type === 'category') {
        await deleteCategory(id);
        toast.success('Category deleted');
        fetchCategories();
      } else {
        await deleteSubCategory(id);
        toast.success('Sub-category deleted');
        fetchSubCategories();
      }
    } catch {
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
        onToggle={handleToggleCat}
        onDelete={handleDeleteCat}
      />
      <SubCategoryManager
        subCategories={subCategories}
        categories={categories}
        onCreate={handleCreateSub}
        onUpdate={handleUpdateSub}
        onDelete={handleDeleteSub}
      />

      <ConfirmModal
        isOpen={deleteConfirm.open}
        title={deleteConfirm.type === 'category' ? 'Delete Category' : 'Delete Sub-category'}
        message="This item will be deactivated and hidden from the store."
        confirmText="Delete"
        onConfirm={confirmDelete}
        onCancel={() => setDeleteConfirm({ open: false, id: null, type: null })}
      />
    </div>
  );
};

export default AdminCategories;
