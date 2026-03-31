// SubCategory manager — CRUD for subcategories under a parent category

import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Save, X, Upload, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadSubCategoryImage } from '../../services/adminService';

const SubCategoryManager = ({ subCategories, categories, onCreate, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(null);
  const [newSub, setNewSub] = useState({ name: '', parentCategory: '', icon: '💊', image: '', displayOrder: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [filterCat, setFilterCat] = useState('');
  const newFileRef = useRef(null);
  const editFileRef = useRef(null);

  const handleImageUpload = async (file, target) => {
    if (!file || !file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await uploadSubCategoryImage(formData);
      const url = res.data.data.url;
      if (target === 'new') {
        setNewSub((prev) => ({ ...prev, image: url }));
      } else {
        setEditing((prev) => ({ ...prev, image: url }));
      }
      toast.success('Image uploaded!');
    } catch {
      toast.error('Failed to upload image');
    } finally {
      setUploading(false);
    }
  };

  const handleCreate = () => {
    if (!newSub.name.trim() || !newSub.parentCategory) {
      toast.error('Name and parent category are required');
      return;
    }
    onCreate(newSub);
    setNewSub({ name: '', parentCategory: '', icon: '💊', image: '', displayOrder: 0 });
    setShowAdd(false);
  };

  const handleUpdate = () => {
    if (!editing.name.trim()) return;
    onUpdate(editing._id, {
      name: editing.name,
      parentCategory: editing.parentCategory?._id || editing.parentCategory,
      icon: editing.icon,
      image: editing.image || '',
      displayOrder: editing.displayOrder,
    });
    setEditing(null);
  };

  const filtered = filterCat
    ? subCategories.filter((s) => (s.parentCategory?._id || s.parentCategory) === filterCat)
    : subCategories;

  return (
    <div className="category-manager" style={{ marginTop: 32 }}>
      <div className="section-header">
        <h3>Sub-Categories</h3>
        <button className="btn-secondary" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={16} /> Add Sub-Category
        </button>
      </div>

      {/* Filter by parent category */}
      <div style={{ marginBottom: 12 }}>
        <select className="input" value={filterCat} onChange={(e) => setFilterCat(e.target.value)} style={{ maxWidth: 250 }}>
          <option value="">All Categories</option>
          {categories.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
        </select>
      </div>

      {showAdd && (
        <div className="cm-add-card" style={{ position: 'relative' }}>
          <button
            className="icon-btn-sm"
            style={{ position: 'absolute', top: 8, right: 8 }}
            onClick={() => { setShowAdd(false); setNewSub({ name: '', parentCategory: '', icon: '💊', image: '', displayOrder: 0 }); }}
          >
            <X size={16} />
          </button>
          <div className="cm-image-row">
            {newSub.image ? (
              <div className="cm-image-preview">
                <img src={newSub.image} alt="Preview" />
                <button className="cm-image-remove" onClick={() => setNewSub({ ...newSub, image: '' })}><X size={12} /></button>
              </div>
            ) : (
              <div className="cm-image-drop" onClick={() => newFileRef.current?.click()}>
                <ImageIcon size={18} />
                <span>Image</span>
              </div>
            )}
            <input ref={newFileRef} type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e.target.files[0], 'new')} />
            <div className="cm-fields">
              <input className="input" placeholder="Sub-category name" value={newSub.name} onChange={(e) => setNewSub({ ...newSub, name: e.target.value })} />
              <select className="input" value={newSub.parentCategory} onChange={(e) => setNewSub({ ...newSub, parentCategory: e.target.value })}>
                <option value="">Parent Category *</option>
                {categories.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
              </select>
              <div className="cm-fields-row">
                <input className="input" placeholder="Icon" value={newSub.icon} onChange={(e) => setNewSub({ ...newSub, icon: e.target.value })} style={{ width: 60 }} />
                <input className="input" type="number" placeholder="Order" value={newSub.displayOrder} onChange={(e) => setNewSub({ ...newSub, displayOrder: Number(e.target.value) })} style={{ width: 70 }} />
                <button className="btn-add-product" onClick={handleCreate} disabled={uploading}>
                  {uploading ? '...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="category-list">
        {filtered.length === 0 && <p className="text-muted" style={{ padding: '12px 0' }}>No sub-categories yet</p>}
        {filtered.map((sub) => (
          <div key={sub._id} className="cm-row">
            {editing?._id === sub._id ? (
              <div className="cm-edit-card">
                <div className="cm-image-row">
                  {editing.image ? (
                    <div className="cm-image-preview">
                      <img src={editing.image} alt="Preview" />
                      <button className="cm-image-remove" onClick={() => setEditing({ ...editing, image: '' })}><X size={12} /></button>
                    </div>
                  ) : (
                    <div className="cm-image-drop" onClick={() => editFileRef.current?.click()}>
                      <ImageIcon size={18} />
                      <span>Image</span>
                    </div>
                  )}
                  <input ref={editFileRef} type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e.target.files[0], 'edit')} />
                  <div className="cm-fields">
                    <input className="input" value={editing.name} onChange={(e) => setEditing({ ...editing, name: e.target.value })} />
                    <div className="cm-fields-row">
                      <input className="input" value={editing.icon} onChange={(e) => setEditing({ ...editing, icon: e.target.value })} style={{ width: 60 }} />
                      <input className="input" type="number" value={editing.displayOrder} onChange={(e) => setEditing({ ...editing, displayOrder: Number(e.target.value) })} style={{ width: 70 }} />
                    </div>
                  </div>
                </div>
                <div className="cm-edit-actions">
                  <button className="icon-btn-sm" onClick={handleUpdate} disabled={uploading}><Save size={16} /></button>
                  <button className="icon-btn-sm" onClick={() => setEditing(null)}><X size={16} /></button>
                </div>
              </div>
            ) : (
              <div className="cm-display">
                <div className="cm-display-left">
                  {sub.image ? (
                    <img className="cm-thumb" src={sub.image} alt={sub.name} />
                  ) : (
                    <span className="cm-icon">{sub.icon}</span>
                  )}
                  <div>
                    <span className="cm-name">{sub.name}</span>
                    <span className="cm-slug">{sub.parentCategory?.name || ''} &middot; {sub.slug}</span>
                  </div>
                </div>
                <div className="cm-display-right">
                  <span className="cm-order">#{sub.displayOrder}</span>
                  <button className="icon-btn-sm" onClick={() => setEditing({ ...sub })}><Pencil size={16} /></button>
                  <button className="icon-btn-sm danger" onClick={() => onDelete(sub._id)}><Trash2 size={16} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default SubCategoryManager;
