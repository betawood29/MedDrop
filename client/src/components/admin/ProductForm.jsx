// Product add/edit form modal with image upload

import { useState, useEffect, useRef } from 'react';
import { X, Upload, ImageIcon, Trash2 } from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadProductImage } from '../../services/adminService';

const ProductForm = ({ product, categories, onSubmit, onClose, loading }) => {
  const [form, setForm] = useState({
    name: '', description: '', price: '', mrp: '', category: '',
    inStock: true, stockQty: 0, requiresPrescription: false, tags: '', image: '',
  });
  const [uploading, setUploading] = useState(false);
  const [imagePreview, setImagePreview] = useState('');
  const fileRef = useRef(null);

  useEffect(() => {
    if (product) {
      setForm({
        name: product.name || '',
        description: product.description || '',
        price: product.price || '',
        mrp: product.mrp || '',
        category: product.category?._id || product.category || '',
        inStock: product.inStock ?? true,
        stockQty: product.stockQty || 0,
        requiresPrescription: product.requiresPrescription || false,
        tags: (product.tags || []).join(', '),
        image: product.image || '',
      });
      if (product.image) setImagePreview(product.image);
    }
  }, [product]);

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      price: Number(form.price),
      mrp: form.mrp ? Number(form.mrp) : null,
      stockQty: Number(form.stockQty),
      tags: form.tags,
    });
  };

  const update = (field, value) => {
    setForm((prev) => {
      const next = { ...prev, [field]: value };
      if (field === 'stockQty') {
        const qty = Number(value);
        if (qty <= 0) next.inStock = false;
        else if (!prev.inStock) next.inStock = true;
      }
      if (field === 'inStock' && value === true && Number(prev.stockQty) <= 0) {
        next.stockQty = 1;
      }
      return next;
    });
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      toast.error('Please select an image file');
      return;
    }
    if (file.size > 2 * 1024 * 1024) {
      toast.error('Image must be under 2MB');
      return;
    }

    // Show local preview immediately
    setImagePreview(URL.createObjectURL(file));
    setUploading(true);

    try {
      const formData = new FormData();
      formData.append('image', file);
      const res = await uploadProductImage(formData);
      const url = res.data.data.url;
      setForm((prev) => ({ ...prev, image: url }));
      setImagePreview(url);
      toast.success('Image uploaded!');
    } catch (err) {
      toast.error('Failed to upload image');
      setImagePreview(form.image || '');
    } finally {
      setUploading(false);
    }
  };

  const removeImage = () => {
    setForm((prev) => ({ ...prev, image: '' }));
    setImagePreview('');
    if (fileRef.current) fileRef.current.value = '';
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3>{product ? 'Edit Product' : 'Add Product'}</h3>
          <button className="icon-btn" onClick={onClose}><X size={20} /></button>
        </div>

        <form onSubmit={handleSubmit} className="product-form">
          {/* Image Upload */}
          <label className="input-label">Product Image</label>
          <div className="pf-image-upload">
            {imagePreview ? (
              <div className="pf-image-preview">
                <img src={imagePreview} alt="Preview" />
                {uploading && <div className="pf-image-uploading">Uploading...</div>}
                <button type="button" className="pf-image-remove" onClick={removeImage} title="Remove image">
                  <Trash2 size={14} />
                </button>
              </div>
            ) : (
              <div className="pf-image-dropzone" onClick={() => fileRef.current?.click()}>
                <ImageIcon size={24} />
                <span>Click to upload image</span>
                <span className="pf-image-hint">JPG, PNG — max 2MB</span>
              </div>
            )}
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              hidden
            />
            {imagePreview && !uploading && (
              <button type="button" className="btn-secondary pf-change-btn" onClick={() => fileRef.current?.click()}>
                <Upload size={14} /> Change Image
              </button>
            )}
          </div>

          <label className="input-label">Name *</label>
          <input className="input" value={form.name} onChange={(e) => update('name', e.target.value)} required />

          <label className="input-label">Description</label>
          <input className="input" value={form.description} onChange={(e) => update('description', e.target.value)} />

          <div className="form-row">
            <div>
              <label className="input-label">Price *</label>
              <input className="input" type="number" value={form.price} onChange={(e) => update('price', e.target.value)} required min="0" />
            </div>
            <div>
              <label className="input-label">MRP</label>
              <input className="input" type="number" value={form.mrp} onChange={(e) => update('mrp', e.target.value)} min="0" />
            </div>
          </div>

          <label className="input-label">Category *</label>
          <select className="input" value={form.category} onChange={(e) => update('category', e.target.value)} required>
            <option value="">Select category</option>
            {categories.map((c) => <option key={c._id} value={c._id}>{c.icon} {c.name}</option>)}
          </select>

          <div className="form-row">
            <div>
              <label className="input-label">Stock Qty</label>
              <input className="input" type="number" value={form.stockQty} onChange={(e) => update('stockQty', e.target.value)} min="0" />
            </div>
            <div className="checkbox-group">
              <label><input type="checkbox" checked={form.inStock} onChange={(e) => update('inStock', e.target.checked)} /> In Stock</label>
              <label><input type="checkbox" checked={form.requiresPrescription} onChange={(e) => update('requiresPrescription', e.target.checked)} /> Prescription</label>
            </div>
          </div>

          <label className="input-label">Tags (comma separated)</label>
          <input className="input" value={form.tags} onChange={(e) => update('tags', e.target.value)} placeholder="fever, pain relief" />

          <button type="submit" className="btn-primary" disabled={loading || uploading}>
            {loading ? 'Saving...' : product ? 'Update Product' : 'Add Product'}
          </button>
        </form>
      </div>
    </div>
  );
};

export default ProductForm;
