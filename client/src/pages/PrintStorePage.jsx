// Print Store page — Blinkit-inspired print service
// Upload files with preview cards, configure per-file settings, sticky price bar

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, X, Printer, Palette, File, Plus, Minus, ShieldCheck, Monitor, Smartphone } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { useCart } from '../hooks/useCart';
import { getPricing } from '../services/printService';
import { formatPrice } from '../utils/formatters';

const getFileIcon = (name) => {
  const ext = name.split('.').pop().toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼️';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['ppt', 'pptx'].includes(ext)) return '📊';
  return '📎';
};

const PrintStorePage = () => {
  const { user } = useAuth();
  const { setPrintOrder } = useCart();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [pricing, setPricing] = useState(null);
  const [uploading, setUploading] = useState(false);

  // Each file has: { file, pages, copies, colorMode, sides }
  const [fileItems, setFileItems] = useState([]);
  const [selectedIdx, setSelectedIdx] = useState(0);

  useEffect(() => {
    getPricing().then((res) => setPricing(res.data.data)).catch(console.error);
  }, []);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setUploading(true);
    setTimeout(() => {
      const items = newFiles.map((f) => ({
        file: f,
        preview: f.type.startsWith('image/') ? URL.createObjectURL(f) : null,
        pages: 1,
        copies: 1,
        colorMode: 'bw',
        sides: 'single',
        orientation: 'portrait',
      }));
      setFileItems((prev) => {
        const merged = [...prev, ...items].slice(0, 10);
        setSelectedIdx(prev.length); // select first new file
        return merged;
      });
      setUploading(false);
      e.target.value = '';
    }, 300);
  };

  const removeFile = (index) => {
    setFileItems((prev) => prev.filter((_, i) => i !== index));
    if (selectedIdx >= index && selectedIdx > 0) setSelectedIdx(selectedIdx - 1);
  };

  const updateFile = (index, field, value) => {
    setFileItems((prev) => prev.map((item, i) => i === index ? { ...item, [field]: value } : item));
  };

  // Calculate totals
  const totalPages = fileItems.reduce((sum, f) => sum + (f.pages * f.copies), 0);
  const totalPrice = fileItems.reduce((sum, f) => {
    if (!pricing) return sum;
    const priceInfo = pricing[f.colorMode];
    const ppp = f.sides === 'double' ? priceInfo.double : priceInfo.single;
    return sum + Math.round(f.pages * f.copies * ppp);
  }, 0);
  const deliveryFee = pricing ? (totalPrice >= pricing.freeDeliveryMin ? 0 : pricing.deliveryFee) : 25;
  const grandTotal = totalPrice + deliveryFee;

  const handleAddToCart = () => {
    if (!user) { toast('Please login first'); navigate('/login'); return; }
    if (fileItems.length === 0) { toast.error('Upload at least one file'); return; }

    setPrintOrder({
      fileItems,
      totalPages,
      totalPrice,
      deliveryFee,
      grandTotal,
    });

    toast.success('Print order added to cart!');
    navigate('/cart');
  };

  const selected = fileItems[selectedIdx];

  return (
    <div className="page-container print-store">
      <div className="category-page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="category-page-title">Print Store</h2>
      </div>

      {/* Privacy banner */}
      <div className="ps-privacy-banner">
        <ShieldCheck size={16} />
        <span>We will delete your files once delivered</span>
      </div>

      {/* File preview cards — horizontal scroll */}
      {fileItems.length > 0 && (
        <div className="ps-file-scroll">
          {fileItems.map((item, i) => (
            <div
              key={i}
              className={`ps-file-card ${selectedIdx === i ? 'selected' : ''}`}
              onClick={() => setSelectedIdx(i)}
            >
              <button className="ps-file-remove" onClick={(e) => { e.stopPropagation(); removeFile(i); }}>
                <X size={14} />
              </button>
              <div className="ps-file-thumb">
                {item.preview ? (
                  <img src={item.preview} alt={item.file.name} />
                ) : (
                  <span className="ps-file-icon">{getFileIcon(item.file.name)}</span>
                )}
              </div>
              <span className="ps-file-label">File {i + 1} ({item.pages} page{item.pages !== 1 ? 's' : ''})</span>
            </div>
          ))}

          {/* Add files card */}
          <div className="ps-file-card ps-add-card" onClick={() => fileInputRef.current?.click()}>
            <div className="ps-file-thumb">
              <Plus size={24} />
            </div>
            <span className="ps-file-label">Add files</span>
          </div>
        </div>
      )}

      {/* Landing state — shown when no files */}
      {fileItems.length === 0 && (
        <>
          {/* Hero */}
          <div className="ps-hero">
            <div className="ps-hero-icon">🖨️</div>
            <h2>Print Store</h2>
            <p>Get your documents printed & delivered to your hostel gate</p>
          </div>

          {/* Upload card */}
          <div className="ps-upload-card" onClick={() => fileInputRef.current?.click()}>
            <div className="ps-upload-card-icon"><Upload size={28} /></div>
            <div>
              <strong>Upload your files</strong>
              <p>We support PDF, DOC, DOCX, JPG, PNG, PPT etc</p>
            </div>
          </div>

          <div className="print-dropzone" onClick={() => fileInputRef.current?.click()}>
            <Upload size={32} />
            <p>Drop files here</p>
            <span className="text-muted">Maximum upload file size: 20 MB · Up to 10 files</span>
          </div>

          {/* Pricing cards */}
          <div className="ps-pricing-grid">
            <div className="ps-pricing-card">
              <div className="ps-pricing-icon"><Palette size={20} /></div>
              <strong>Coloured</strong>
              <span className="ps-pricing-price">₹5/page</span>
            </div>
            <div className="ps-pricing-card">
              <div className="ps-pricing-icon"><File size={20} /></div>
              <strong>Black & White</strong>
              <span className="ps-pricing-price">₹2/page</span>
            </div>
            <div className="ps-pricing-card">
              <div className="ps-pricing-icon">📄</div>
              <strong>Double Sided</strong>
              <span className="ps-pricing-price">25% off</span>
            </div>
          </div>

          {/* Why section */}
          <div className="ps-why-section">
            <h3>Why try print store?</h3>
            <div className="ps-why-grid">
              <div className="ps-why-item">
                <span>🚀</span>
                <div><strong>Fast Delivery</strong><p>Delivered to your gate in 30–60 mins</p></div>
              </div>
              <div className="ps-why-item">
                <span>🔒</span>
                <div><strong>Safe & Secure</strong><p>Files deleted after delivery</p></div>
              </div>
              <div className="ps-why-item">
                <span>💰</span>
                <div><strong>Best Prices</strong><p>Starting at just ₹2/page</p></div>
              </div>
              <div className="ps-why-item">
                <span>🎯</span>
                <div><strong>High Quality</strong><p>Crisp, clear prints every time</p></div>
              </div>
            </div>
          </div>
        </>
      )}

      <input
        ref={fileInputRef}
        type="file"
        multiple
        accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.ppt,.pptx"
        onChange={handleFileChange}
        style={{ display: 'none' }}
      />

      {/* Per-file configuration */}
      {selected && (
        <div className="ps-config-section">
          <div className="ps-config-header">
            <h3>File {selectedIdx + 1} ({selected.pages} page{selected.pages !== 1 ? 's' : ''})</h3>
            <span className="text-muted">{selected.file.name}</span>
          </div>

          <div className="ps-config-divider" />

          {/* Pages */}
          <div className="ps-config-row">
            <div>
              <strong>Number of pages</strong>
              <span className="text-muted ps-config-sub">Enter total pages in this file</span>
            </div>
            <div className="print-counter">
              <button onClick={() => updateFile(selectedIdx, 'pages', Math.max(1, selected.pages - 1))}><Minus size={16} /></button>
              <input
                type="number"
                value={selected.pages}
                onChange={(e) => updateFile(selectedIdx, 'pages', Math.max(1, parseInt(e.target.value) || 1))}
                min="1"
              />
              <button onClick={() => updateFile(selectedIdx, 'pages', selected.pages + 1)}><Plus size={16} /></button>
            </div>
          </div>

          <div className="ps-config-divider" />

          {/* Copies */}
          <div className="ps-config-row">
            <div>
              <strong>Number of copies</strong>
              <span className="text-muted ps-config-sub">File {selectedIdx + 1} ({selected.pages} page{selected.pages !== 1 ? 's' : ''})</span>
            </div>
            <div className="print-counter">
              <button onClick={() => updateFile(selectedIdx, 'copies', Math.max(1, selected.copies - 1))}><Minus size={16} /></button>
              <span>{selected.copies}</span>
              <button onClick={() => updateFile(selectedIdx, 'copies', Math.min(50, selected.copies + 1))}><Plus size={16} /></button>
            </div>
          </div>

          <div className="ps-config-divider" />

          {/* Color mode */}
          <div className="ps-config-block">
            <strong>Choose print color</strong>
            <div className="ps-chip-row">
              <button
                className={`ps-chip ${selected.colorMode === 'color' ? 'active' : ''}`}
                onClick={() => updateFile(selectedIdx, 'colorMode', 'color')}
              >
                <Palette size={14} />
                <span>Coloured</span>
                <span className="ps-chip-price">₹5/page</span>
              </button>
              <button
                className={`ps-chip ${selected.colorMode === 'bw' ? 'active' : ''}`}
                onClick={() => updateFile(selectedIdx, 'colorMode', 'bw')}
              >
                <File size={14} />
                <span>B & W</span>
                <span className="ps-chip-price">₹2/page</span>
              </button>
            </div>
          </div>

          <div className="ps-config-divider" />

          {/* Sides */}
          <div className="ps-config-block">
            <strong>Choose print sides</strong>
            <div className="ps-chip-row">
              <button
                className={`ps-chip ${selected.sides === 'single' ? 'active' : ''}`}
                onClick={() => updateFile(selectedIdx, 'sides', 'single')}
              >
                <span>Single Side</span>
              </button>
              <button
                className={`ps-chip ${selected.sides === 'double' ? 'active' : ''}`}
                onClick={() => updateFile(selectedIdx, 'sides', 'double')}
              >
                <span>Double Side</span>
                <span className="ps-chip-price">25% off</span>
              </button>
            </div>
          </div>

          <div className="ps-config-divider" />

          {/* Orientation */}
          <div className="ps-config-block">
            <strong>Choose print orientation</strong>
            <div className="ps-chip-row">
              <button
                className={`ps-chip ${selected.orientation === 'portrait' ? 'active' : ''}`}
                onClick={() => updateFile(selectedIdx, 'orientation', 'portrait')}
              >
                <Smartphone size={14} />
                <span>Portrait</span>
                <span className="ps-chip-price">8.3 x 11.7 in</span>
              </button>
              <button
                className={`ps-chip ${selected.orientation === 'landscape' ? 'active' : ''}`}
                onClick={() => updateFile(selectedIdx, 'orientation', 'landscape')}
              >
                <Monitor size={14} />
                <span>Landscape</span>
                <span className="ps-chip-price">11.7 x 8.3 in</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Sticky bottom price bar */}
      {fileItems.length > 0 && (
        <div className="ps-bottom-bar">
          <div className="ps-bottom-info">
            <Printer size={20} />
            <div>
              <strong>Total {totalPages} pages</strong>
              <span>{formatPrice(grandTotal)}</span>
            </div>
          </div>
          <button className="ps-bottom-btn" onClick={handleAddToCart}>
            Add to Cart
          </button>
        </div>
      )}

      {/* Upload modal */}
      {uploading && (
        <div className="ps-upload-modal">
          <div className="ps-upload-content">
            <div className="ps-upload-icon">📄</div>
            <div className="ps-upload-progress"><div className="ps-upload-bar" /></div>
            <strong>Uploading your files</strong>
            <p className="text-muted">We delete your uploaded files once order is delivered</p>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintStorePage;
