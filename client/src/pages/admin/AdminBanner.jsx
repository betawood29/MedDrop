// Admin banner page — manage hero banner content and image

import { useState, useEffect, useRef } from 'react';
import { Plus, Edit2, Trash2, Upload, Check, X, Image as ImageIcon } from 'lucide-react';
import toast from 'react-hot-toast';
import Loader from '../../components/common/Loader';
import { getBanners, createBanner, updateBanner, deleteBanner, uploadBannerImage } from '../../services/bannerService';

const emptyForm = {
  title: '',
  highlight: '',
  subtitle: '',
  image: '',
  link: '/category/all',
  features: ['', '', ''],
  isActive: true,
};

const AdminBanner = () => {
  const [banners, setBanners] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editing, setEditing] = useState(null); // null = list, 'new' = create, id = edit
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const fileRef = useRef(null);

  const fetchBanners = async () => {
    try {
      const res = await getBanners();
      setBanners(res.data.data || []);
    } catch {
      toast.error('Failed to load banners');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchBanners(); }, []);

  const handleEdit = (banner) => {
    setEditing(banner._id);
    setForm({
      title: banner.title || '',
      highlight: banner.highlight || '',
      subtitle: banner.subtitle || '',
      image: banner.image || '',
      link: banner.link || '/category/all',
      features: banner.features?.length ? [...banner.features, '', '', ''].slice(0, 3) : ['', '', ''],
      isActive: banner.isActive,
    });
  };

  const handleNew = () => {
    setEditing('new');
    setForm(emptyForm);
  };

  const handleCancel = () => {
    setEditing(null);
    setForm(emptyForm);
  };

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('image', file);
      const res = await uploadBannerImage(fd);
      setForm((prev) => ({ ...prev, image: res.data.data.url }));
      toast.success('Image uploaded');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSave = async () => {
    if (!form.title || !form.highlight) {
      toast.error('Title and highlight text are required');
      return;
    }
    setSaving(true);
    try {
      const data = {
        ...form,
        features: form.features.filter((f) => f.trim()),
      };
      if (editing === 'new') {
        await createBanner(data);
        toast.success('Banner created!');
      } else {
        await updateBanner(editing, data);
        toast.success('Banner updated!');
      }
      setEditing(null);
      setForm(emptyForm);
      fetchBanners();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this banner?')) return;
    try {
      await deleteBanner(id);
      toast.success('Banner deleted');
      fetchBanners();
    } catch {
      toast.error('Failed to delete');
    }
  };

  const updateFeature = (index, value) => {
    setForm((prev) => {
      const features = [...prev.features];
      features[index] = value;
      return { ...prev, features };
    });
  };

  if (loading) return <Loader text="Loading banners..." />;

  // Edit / Create form
  if (editing) {
    return (
      <div className="admin-page">
        <h2>{editing === 'new' ? 'Create Banner' : 'Edit Banner'}</h2>

        <div className="admin-banner-form">
          {/* Image preview + upload */}
          <div className="admin-banner-img-section">
            <div className="admin-banner-preview">
              {form.image ? (
                <img src={form.image} alt="Banner preview" />
              ) : (
                <div className="admin-banner-placeholder">
                  <ImageIcon size={32} />
                  <span>No image</span>
                </div>
              )}
            </div>
            <button
              className="btn-secondary"
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              style={{ width: '100%' }}
            >
              <Upload size={16} />
              {uploading ? 'Uploading...' : 'Upload Banner Image'}
            </button>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              onChange={handleImageUpload}
              style={{ display: 'none' }}
            />
            <p className="text-muted" style={{ fontSize: '0.75rem', marginTop: 4 }}>
              Or paste an image URL below
            </p>
            <input
              className="input"
              value={form.image}
              onChange={(e) => setForm({ ...form, image: e.target.value })}
              placeholder="Image URL (optional)"
            />
          </div>

          {/* Text fields */}
          <div className="admin-banner-fields">
            <label className="input-label">Title *</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Medicines & Essentials"
            />

            <label className="input-label">Highlight Text *</label>
            <input
              className="input"
              value={form.highlight}
              onChange={(e) => setForm({ ...form, highlight: e.target.value })}
              placeholder="e.g. delivered to your gate"
            />

            <label className="input-label">Subtitle</label>
            <input
              className="input"
              value={form.subtitle}
              onChange={(e) => setForm({ ...form, subtitle: e.target.value })}
              placeholder="e.g. Chitkara University Campus Delivery"
            />

            <label className="input-label">Link (where banner clicks to)</label>
            <input
              className="input"
              value={form.link}
              onChange={(e) => setForm({ ...form, link: e.target.value })}
              placeholder="/category/all"
            />

            <label className="input-label">Feature Chips (up to 3)</label>
            {form.features.map((feat, i) => (
              <input
                key={i}
                className="input"
                value={feat}
                onChange={(e) => updateFeature(i, e.target.value)}
                placeholder={`Feature ${i + 1}, e.g. Free above ₹299`}
                style={{ marginBottom: 6 }}
              />
            ))}

            <label className="input-label" style={{ marginTop: 8 }}>
              <input
                type="checkbox"
                checked={form.isActive}
                onChange={(e) => setForm({ ...form, isActive: e.target.checked })}
                style={{ marginRight: 8 }}
              />
              Set as active banner
            </label>

            <div className="admin-banner-actions">
              <button className="btn-secondary" onClick={handleCancel}><X size={16} /> Cancel</button>
              <button className="btn-primary" onClick={handleSave} disabled={saving}>
                <Check size={16} /> {saving ? 'Saving...' : 'Save Banner'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // List view
  return (
    <div className="admin-page">
      <div className="admin-banner-header">
        <h2>Banner Management</h2>
        <button className="btn-primary" onClick={handleNew}>
          <Plus size={16} /> New Banner
        </button>
      </div>

      {banners.length === 0 ? (
        <div className="empty-state">
          <ImageIcon size={48} />
          <h3>No banners yet</h3>
          <p>Create your first hero banner</p>
        </div>
      ) : (
        <div className="admin-banner-list">
          {banners.map((b) => (
            <div key={b._id} className={`admin-banner-card ${b.isActive ? 'active' : ''}`}>
              <div className="admin-banner-card-img">
                {b.image ? (
                  <img src={b.image} alt={b.title} />
                ) : (
                  <div className="admin-banner-placeholder-sm"><ImageIcon size={20} /></div>
                )}
              </div>
              <div className="admin-banner-card-info">
                <h4>{b.title} <span className="hero-highlight">{b.highlight}</span></h4>
                <p>{b.subtitle}</p>
                {b.isActive && <span className="admin-banner-active-badge">Active</span>}
              </div>
              <div className="admin-banner-card-actions">
                <button className="icon-btn" onClick={() => handleEdit(b)}><Edit2 size={16} /></button>
                <button className="icon-btn danger" onClick={() => handleDelete(b._id)}><Trash2 size={16} /></button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default AdminBanner;
