// Category manager — list, add, edit, delete categories with image upload

import { useState, useRef } from 'react';
import { Plus, Pencil, Trash2, Save, X, Upload, ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadCategoryImage } from '../../services/adminService';

const CategoryManager = ({ categories, onCreate, onUpdate, onDelete }) => {
  const [editing, setEditing] = useState(null);
  const [newCat, setNewCat] = useState({ name: '', icon: '📦', image: '', displayOrder: 0 });
  const [showAdd, setShowAdd] = useState(false);
  const [uploading, setUploading] = useState(false);
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
      const res = await uploadCategoryImage(formData);
      const url = res.data.data.url;

      if (target === 'new') {
        setNewCat((prev) => ({ ...prev, image: url }));
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
    if (!newCat.name.trim()) return;
    onCreate(newCat);
    setNewCat({ name: '', icon: '📦', image: '', displayOrder: 0 });
    setShowAdd(false);
  };

  const handleUpdate = () => {
    if (!editing.name.trim()) return;
    onUpdate(editing._id, {
      name: editing.name,
      icon: editing.icon,
      image: editing.image || '',
      displayOrder: editing.displayOrder,
    });
    setEditing(null);
  };

  return (
    <div className="category-manager">
      <div className="section-header">
        <h3>Categories</h3>
        <button className="btn-secondary" onClick={() => setShowAdd(!showAdd)}>
          <Plus size={16} /> Add Category
        </button>
      </div>

      {showAdd && (
        <div className="cm-add-card">
          <div className="cm-image-row">
            {newCat.image ? (
              <div className="cm-image-preview">
                <img src={newCat.image} alt="Preview" />
                <button className="cm-image-remove" onClick={() => setNewCat({ ...newCat, image: '' })}><X size={12} /></button>
              </div>
            ) : (
              <div className="cm-image-drop" onClick={() => newFileRef.current?.click()}>
                <ImageIcon size={18} />
                <span>Image</span>
              </div>
            )}
            <input ref={newFileRef} type="file" accept="image/*" hidden onChange={(e) => handleImageUpload(e.target.files[0], 'new')} />
            <div className="cm-fields">
              <input className="input" placeholder="Category name" value={newCat.name} onChange={(e) => setNewCat({ ...newCat, name: e.target.value })} />
              <div className="cm-fields-row">
                <input className="input" placeholder="Icon" value={newCat.icon} onChange={(e) => setNewCat({ ...newCat, icon: e.target.value })} style={{ width: 60 }} />
                <input className="input" type="number" placeholder="Order" value={newCat.displayOrder} onChange={(e) => setNewCat({ ...newCat, displayOrder: Number(e.target.value) })} style={{ width: 70 }} />
                <button className="btn-add-product" onClick={handleCreate} disabled={uploading}>
                  {uploading ? '...' : 'Add'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      <div className="category-list">
        {categories.map((cat) => (
          <div key={cat._id} className="cm-row">
            {editing?._id === cat._id ? (
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
                      {!editing.image && (
                        <button className="btn-secondary btn-sm" onClick={() => editFileRef.current?.click()} disabled={uploading}>
                          <Upload size={12} /> Photo
                        </button>
                      )}
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
                  {cat.image ? (
                    <img className="cm-thumb" src={cat.image} alt={cat.name} />
                  ) : (
                    <span className="cm-icon">{cat.icon}</span>
                  )}
                  <div>
                    <span className="cm-name">{cat.name}</span>
                    <span className="cm-slug">{cat.slug}</span>
                  </div>
                </div>
                <div className="cm-display-right">
                  <span className="cm-order">#{cat.displayOrder}</span>
                  <button className="icon-btn-sm" onClick={() => setEditing({ ...cat })}><Pencil size={16} /></button>
                  <button className="icon-btn-sm danger" onClick={() => onDelete(cat._id)}><Trash2 size={16} /></button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default CategoryManager;
