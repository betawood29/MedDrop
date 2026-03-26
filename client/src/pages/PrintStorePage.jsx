// Print Store page — Blinkit-style print/photocopy service
// Upload files, configure print settings, see pricing, place order

import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowLeft, Upload, FileText, X, Printer, Copy, Palette, Layers, File } from 'lucide-react';
import toast from 'react-hot-toast';
import { useAuth } from '../hooks/useAuth';
import { getPricing, createPrintOrder } from '../services/printService';
import { GATE_OPTIONS, HOSTEL_OPTIONS } from '../utils/constants';
import { formatPrice } from '../utils/formatters';

const PrintStorePage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const fileInputRef = useRef(null);
  const [pricing, setPricing] = useState(null);
  const [files, setFiles] = useState([]);
  const [config, setConfig] = useState({
    copies: 1,
    colorMode: 'bw',
    sides: 'single',
    paperSize: 'A4',
    totalPages: '',
  });
  const [delivery, setDelivery] = useState({
    hostel: user?.hostel || '',
    gate: user?.preferredGate || '',
    note: '',
  });
  const [loading, setLoading] = useState(false);
  const [step, setStep] = useState(1); // 1: upload, 2: configure, 3: review

  useEffect(() => {
    getPricing().then((res) => setPricing(res.data.data)).catch(console.error);
  }, []);

  const handleFileChange = (e) => {
    const newFiles = Array.from(e.target.files);
    setFiles((prev) => [...prev, ...newFiles].slice(0, 10));
    e.target.value = '';
  };

  const removeFile = (index) => {
    setFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const getFileIcon = (name) => {
    const ext = name.split('.').pop().toLowerCase();
    if (ext === 'pdf') return '📄';
    if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼️';
    if (['doc', 'docx'].includes(ext)) return '📝';
    if (['ppt', 'pptx'].includes(ext)) return '📊';
    return '📎';
  };

  const calculatePrice = () => {
    if (!pricing || !config.totalPages) return null;
    const pages = parseInt(config.totalPages) || 0;
    const copies = parseInt(config.copies) || 1;
    const priceInfo = pricing[config.colorMode];
    const pricePerPage = config.sides === 'double' ? priceInfo.double : priceInfo.single;
    const subtotal = Math.round(pages * copies * pricePerPage);
    const deliveryFee = subtotal >= pricing.freeDeliveryMin ? 0 : pricing.deliveryFee;
    return { pricePerPage, subtotal, deliveryFee, total: subtotal + deliveryFee, pages, copies };
  };

  const priceCalc = calculatePrice();

  const handleSubmit = async () => {
    if (!user) {
      toast('Please login first');
      navigate('/login');
      return;
    }

    if (files.length === 0) { toast.error('Please upload at least one file'); return; }
    if (!config.totalPages || config.totalPages < 1) { toast.error('Enter total pages'); return; }
    if (!delivery.hostel || !delivery.gate) { toast.error('Select hostel and gate'); return; }

    setLoading(true);
    try {
      const formData = new FormData();
      files.forEach((f) => formData.append('files', f));
      formData.append('copies', config.copies);
      formData.append('colorMode', config.colorMode);
      formData.append('sides', config.sides);
      formData.append('paperSize', config.paperSize);
      formData.append('totalPages', config.totalPages);
      formData.append('hostel', delivery.hostel);
      formData.append('gate', delivery.gate);
      formData.append('note', delivery.note);

      const res = await createPrintOrder(formData);
      toast.success(`Print order ${res.data.data.orderId} placed!`);
      navigate('/orders');
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to place order');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="page-container print-store">
      <div className="category-page-header">
        <button className="back-btn" onClick={() => navigate('/')}>
          <ArrowLeft size={20} />
        </button>
        <h2 className="category-page-title">Print Store</h2>
      </div>

      {/* Pricing info banner */}
      <div className="print-pricing-banner">
        <Printer size={20} />
        <div>
          <strong>B&W: ₹2/page</strong> &middot; <strong>Color: ₹5/page</strong>
          <p>Double-sided available &middot; Free delivery above ₹299</p>
        </div>
      </div>

      {/* Step indicators */}
      <div className="print-steps">
        <div className={`print-step ${step >= 1 ? 'active' : ''}`} onClick={() => setStep(1)}>
          <span className="print-step-num">1</span> Upload
        </div>
        <div className={`print-step-line ${step >= 2 ? 'active' : ''}`} />
        <div className={`print-step ${step >= 2 ? 'active' : ''}`} onClick={() => files.length > 0 && setStep(2)}>
          <span className="print-step-num">2</span> Configure
        </div>
        <div className={`print-step-line ${step >= 3 ? 'active' : ''}`} />
        <div className={`print-step ${step >= 3 ? 'active' : ''}`} onClick={() => files.length > 0 && config.totalPages && setStep(3)}>
          <span className="print-step-num">3</span> Order
        </div>
      </div>

      {/* Step 1: Upload Files */}
      {step === 1 && (
        <div className="print-section">
          <h3><Upload size={18} /> Upload Your Files</h3>
          <p className="text-muted">PDF, DOC, DOCX, JPG, PNG, PPT (max 20MB each, up to 10 files)</p>

          <div className="print-dropzone" onClick={() => fileInputRef.current?.click()}>
            <Upload size={32} />
            <p>Tap to upload files</p>
            <span className="text-muted">or drag and drop</span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.jpg,.jpeg,.png,.ppt,.pptx"
            onChange={handleFileChange}
            style={{ display: 'none' }}
          />

          {files.length > 0 && (
            <div className="print-file-list">
              {files.map((file, i) => (
                <div key={i} className="print-file-item">
                  <span className="print-file-icon">{getFileIcon(file.name)}</span>
                  <div className="print-file-info">
                    <span className="print-file-name">{file.name}</span>
                    <span className="text-muted">{(file.size / 1024).toFixed(0)} KB</span>
                  </div>
                  <button className="icon-btn-sm danger" onClick={() => removeFile(i)}><X size={16} /></button>
                </div>
              ))}
            </div>
          )}

          <button
            className="btn-primary"
            disabled={files.length === 0}
            onClick={() => setStep(2)}
          >
            Continue to Configure
          </button>
        </div>
      )}

      {/* Step 2: Configure */}
      {step === 2 && (
        <div className="print-section">
          <h3><Layers size={18} /> Print Settings</h3>

          <label className="input-label">Total Pages (across all files)</label>
          <input
            type="number"
            className="input"
            value={config.totalPages}
            onChange={(e) => setConfig({ ...config, totalPages: e.target.value })}
            placeholder="e.g. 25"
            min="1"
          />

          <label className="input-label">Number of Copies</label>
          <div className="print-counter">
            <button onClick={() => setConfig({ ...config, copies: Math.max(1, config.copies - 1) })}>-</button>
            <span>{config.copies}</span>
            <button onClick={() => setConfig({ ...config, copies: Math.min(50, config.copies + 1) })}>+</button>
          </div>

          <label className="input-label">Print Mode</label>
          <div className="print-options">
            <button
              className={`print-option ${config.colorMode === 'bw' ? 'active' : ''}`}
              onClick={() => setConfig({ ...config, colorMode: 'bw' })}
            >
              <File size={18} />
              <span>Black & White</span>
              <span className="print-option-price">₹2/page</span>
            </button>
            <button
              className={`print-option ${config.colorMode === 'color' ? 'active' : ''}`}
              onClick={() => setConfig({ ...config, colorMode: 'color' })}
            >
              <Palette size={18} />
              <span>Color</span>
              <span className="print-option-price">₹5/page</span>
            </button>
          </div>

          <label className="input-label">Sides</label>
          <div className="print-options">
            <button
              className={`print-option ${config.sides === 'single' ? 'active' : ''}`}
              onClick={() => setConfig({ ...config, sides: 'single' })}
            >
              <span>Single Side</span>
            </button>
            <button
              className={`print-option ${config.sides === 'double' ? 'active' : ''}`}
              onClick={() => setConfig({ ...config, sides: 'double' })}
            >
              <span>Double Side</span>
              <span className="print-option-price">25% off</span>
            </button>
          </div>

          <label className="input-label">Paper Size</label>
          <div className="print-options three">
            {['A4', 'A3', 'Letter'].map((size) => (
              <button
                key={size}
                className={`print-option ${config.paperSize === size ? 'active' : ''}`}
                onClick={() => setConfig({ ...config, paperSize: size })}
              >
                <span>{size}</span>
              </button>
            ))}
          </div>

          {priceCalc && (
            <div className="print-price-preview">
              <div className="summary-row">
                <span>{priceCalc.pages} pages x {priceCalc.copies} copies x {formatPrice(priceCalc.pricePerPage)}</span>
                <span>{formatPrice(priceCalc.subtotal)}</span>
              </div>
              <div className="summary-row">
                <span>Delivery</span>
                <span className={priceCalc.deliveryFee === 0 ? 'text-green' : ''}>
                  {priceCalc.deliveryFee === 0 ? 'FREE' : formatPrice(priceCalc.deliveryFee)}
                </span>
              </div>
              <div className="summary-row summary-total">
                <span>Total</span>
                <span>{formatPrice(priceCalc.total)}</span>
              </div>
            </div>
          )}

          <div className="print-nav-btns">
            <button className="btn-secondary" onClick={() => setStep(1)}>Back</button>
            <button
              className="btn-primary"
              disabled={!config.totalPages || config.totalPages < 1}
              onClick={() => setStep(3)}
            >
              Review Order
            </button>
          </div>
        </div>
      )}

      {/* Step 3: Review & Delivery */}
      {step === 3 && (
        <div className="print-section">
          <h3><Printer size={18} /> Review & Place Order</h3>

          <div className="print-review-card">
            <div className="print-review-row">
              <span>Files</span>
              <span>{files.length} file{files.length > 1 ? 's' : ''}</span>
            </div>
            <div className="print-review-row">
              <span>Pages</span>
              <span>{config.totalPages} x {config.copies} copies</span>
            </div>
            <div className="print-review-row">
              <span>Mode</span>
              <span>{config.colorMode === 'bw' ? 'Black & White' : 'Color'}, {config.sides === 'single' ? 'Single-sided' : 'Double-sided'}</span>
            </div>
            <div className="print-review-row">
              <span>Paper</span>
              <span>{config.paperSize}</span>
            </div>
            {priceCalc && (
              <div className="print-review-row total">
                <span>Total</span>
                <span>{formatPrice(priceCalc.total)}</span>
              </div>
            )}
          </div>

          <h3 style={{ marginTop: 20 }}>Delivery Details</h3>

          <label className="input-label">Hostel *</label>
          <select className="input" value={delivery.hostel} onChange={(e) => setDelivery({ ...delivery, hostel: e.target.value })}>
            <option value="">Select hostel</option>
            {HOSTEL_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
          </select>

          <label className="input-label">Pickup Gate *</label>
          <select className="input" value={delivery.gate} onChange={(e) => setDelivery({ ...delivery, gate: e.target.value })}>
            <option value="">Select gate</option>
            {GATE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
          </select>

          <label className="input-label">Special Instructions</label>
          <textarea
            className="input"
            value={delivery.note}
            onChange={(e) => setDelivery({ ...delivery, note: e.target.value })}
            placeholder="e.g. Print pages 1-10 only, or staple together..."
            rows={3}
          />

          <div className="print-nav-btns">
            <button className="btn-secondary" onClick={() => setStep(2)}>Back</button>
            <button className="btn-primary" disabled={loading} onClick={handleSubmit}>
              {loading ? 'Placing Order...' : `Place Order (COD) ${priceCalc ? formatPrice(priceCalc.total) : ''}`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintStorePage;
