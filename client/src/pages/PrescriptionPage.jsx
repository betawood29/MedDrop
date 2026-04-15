// Prescription upload page
// Flow: upload → pending → admin approves → user can request delivery OR order medicines

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, FileText, CheckCircle, XCircle, Clock,
  Trash2, Eye, PhoneCall, MessageSquare, ShieldCheck, ChevronRight,
  Truck, X
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  uploadPrescription, getMyPrescriptions, deletePrescription, requestDelivery
} from '../services/prescriptionService';
import { GATE_OPTIONS, HOSTEL_OPTIONS, DELIVERY_REQUEST_STATUSES } from '../utils/constants';

const STATUS_CONFIG = {
  pending:  { label: 'Under Review', color: '#f59e0b', bg: '#fef3c7', icon: Clock },
  approved: { label: 'Approved',     color: '#22c55e', bg: '#dcfce7', icon: CheckCircle },
  rejected: { label: 'Rejected',     color: '#ef4444', bg: '#fee2e2', icon: XCircle },
};

const PrescriptionPage = () => {
  const navigate  = useNavigate();
  const fileInputRef = useRef(null);

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [uploading,     setUploading]     = useState(false);
  const [selectedFile,  setSelectedFile]  = useState(null);
  const [preview,       setPreview]       = useState(null);
  const [note,          setNote]          = useState('');
  const [dragOver,      setDragOver]      = useState(false);
  const [showGuide,     setShowGuide]     = useState(false);
  const [viewingRx,     setViewingRx]     = useState(null);

  // Delivery request modal state
  const [deliveryModal, setDeliveryModal] = useState(null); // prescription object
  const [dlvHostel,     setDlvHostel]     = useState('');
  const [dlvGate,       setDlvGate]       = useState('');
  const [dlvNote,       setDlvNote]       = useState('');
  const [dlvSubmitting, setDlvSubmitting] = useState(false);

  const fetchPrescriptions = useCallback(async () => {
    try {
      const res = await getMyPrescriptions();
      setPrescriptions(res.data.data || []);
    } catch { /* silent */ }
    finally { setLoading(false); }
  }, []);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  /* ── file helpers ── */
  const handleFileSelect = (file) => {
    if (!file) return;
    if (!['image/jpeg','image/jpg','image/png','application/pdf'].includes(file.type)) {
      toast.error('Only JPG, PNG, or PDF files are allowed'); return;
    }
    if (file.size > 10 * 1024 * 1024) { toast.error('File size must be under 10 MB'); return; }
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const r = new FileReader();
      r.onload = (e) => setPreview(e.target.result);
      r.readAsDataURL(file);
    } else { setPreview('pdf'); }
  };

  const clearSelected = () => {
    setSelectedFile(null); setPreview(null); setNote('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const fd = new FormData();
      fd.append('prescription', selectedFile);
      if (note.trim()) fd.append('note', note.trim());
      await uploadPrescription(fd);
      toast.success('Prescription uploaded! Our pharmacist will review it shortly.');
      clearSelected();
      fetchPrescriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally { setUploading(false); }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this prescription?')) return;
    try {
      await deletePrescription(id);
      toast.success('Prescription deleted');
      setPrescriptions((p) => p.filter((x) => x._id !== id));
    } catch (err) { toast.error(err.response?.data?.message || 'Could not delete'); }
  };

  /* ── delivery request ── */
  const openDeliveryModal = (rx) => {
    setDeliveryModal(rx); setDlvHostel(''); setDlvGate(''); setDlvNote('');
  };

  const handleRequestDelivery = async () => {
    if (!dlvHostel) { toast.error('Please select your hostel'); return; }
    if (!dlvGate)   { toast.error('Please select pickup gate');  return; }
    setDlvSubmitting(true);
    try {
      await requestDelivery(deliveryModal._id, { hostel: dlvHostel, gate: dlvGate, note: dlvNote });
      toast.success('Delivery requested! We will arrange your medicines.');
      setDeliveryModal(null);
      fetchPrescriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not request delivery');
    } finally { setDlvSubmitting(false); }
  };

  /* ── helpers ── */
  const isUnused = (rx) => !rx.order && !rx.deliveryRequest?.hostel;

  return (
    <div className="rx-page">

      {/* ── Header ── */}
      <div className="rx-header">
        <button className="rx-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="rx-title">Upload Prescription</h1>
          <p className="rx-subtitle">Required for prescription medicines</p>
        </div>
      </div>

      <div className="rx-content">

        {/* Trust badges */}
        <div className="rx-trust-row">
          <div className="rx-trust-item"><ShieldCheck size={16} className="rx-trust-icon" /><span>Encrypted & Secure</span></div>
          <div className="rx-trust-item"><CheckCircle  size={16} className="rx-trust-icon" /><span>Verified by Pharmacist</span></div>
          <div className="rx-trust-item"><Clock        size={16} className="rx-trust-icon" /><span>Quick Review</span></div>
        </div>

        {/* ── Upload card ── */}
        <div className="rx-upload-card">
          <div
            className={`rx-drop-zone ${dragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFileSelect(e.dataTransfer.files[0]); }}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
          >
            {!selectedFile ? (
              <div className="rx-drop-empty">
                <div className="rx-drop-icon-wrap"><Upload size={32} /></div>
                <p className="rx-drop-title">Upload Prescription</p>
                <p className="rx-drop-hint">Drag & drop or <span className="rx-link">browse files</span></p>
                <p className="rx-drop-formats">JPG, PNG, PDF • Max 10 MB</p>
              </div>
            ) : (
              <div className="rx-preview-wrap">
                {preview === 'pdf'
                  ? <div className="rx-pdf-preview"><FileText size={48} /><span>{selectedFile.name}</span></div>
                  : <img src={preview} alt="preview" className="rx-img-preview" />
                }
                <button className="rx-clear-btn" onClick={(e) => { e.stopPropagation(); clearSelected(); }}>
                  <XCircle size={22} />
                </button>
              </div>
            )}
          </div>

          <input ref={fileInputRef} type="file"
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />

          {selectedFile && (
            <div className="rx-note-section">
              <label className="rx-note-label">Add a note (optional)</label>
              <textarea className="rx-note-input" rows={2} maxLength={500}
                placeholder="e.g. For cough, prescribed by Dr. Sharma..."
                value={note} onChange={(e) => setNote(e.target.value)}
              />
              <button className="rx-upload-btn" onClick={handleUpload} disabled={uploading}>
                {uploading
                  ? <span className="rx-uploading"><span className="rx-spinner" /> Uploading...</span>
                  : <><Upload size={18} /> Upload Prescription</>
                }
              </button>
            </div>
          )}

          <button className="rx-guide-toggle" onClick={() => setShowGuide((v) => !v)}>
            <span>What is a valid prescription?</span>
            <ChevronRight size={16} className={showGuide ? 'rotated' : ''} />
          </button>
          {showGuide && (
            <div className="rx-guide">
              <div className="rx-guide-item"><CheckCircle size={14} /><span>Doctor's name, signature & stamp</span></div>
              <div className="rx-guide-item"><CheckCircle size={14} /><span>Patient name & date</span></div>
              <div className="rx-guide-item"><CheckCircle size={14} /><span>Medicine name, dose & duration</span></div>
              <div className="rx-guide-item"><CheckCircle size={14} /><span>Hospital/clinic address</span></div>
            </div>
          )}
        </div>

        {/* OR divider */}
        <div className="rx-or-divider">
          <span className="rx-or-line" /><span className="rx-or-text">OR</span><span className="rx-or-line" />
        </div>

        {/* Consult options */}
        <div className="rx-consult-section">
          <p className="rx-consult-heading">Don't have a prescription?</p>
          <div className="rx-consult-cards">
            <a href="tel:+911234567890" className="rx-consult-card">
              <div className="rx-consult-icon phone"><PhoneCall size={22} /></div>
              <div className="rx-consult-info">
                <span className="rx-consult-title">Call Pharmacist</span>
                <span className="rx-consult-sub">Get guidance on medicines</span>
              </div>
              <ChevronRight size={16} className="rx-consult-arrow" />
            </a>
            <button className="rx-consult-card" onClick={() => navigate('/suggestions')}>
              <div className="rx-consult-icon chat"><MessageSquare size={22} /></div>
              <div className="rx-consult-info">
                <span className="rx-consult-title">Consult via Message</span>
                <span className="rx-consult-sub">Send us a query or suggestion</span>
              </div>
              <ChevronRight size={16} className="rx-consult-arrow" />
            </button>
          </div>
        </div>

        {/* ── My Prescriptions history ── */}
        <div className="rx-history-section">
          <h2 className="rx-history-title">My Prescriptions</h2>

          {loading ? (
            <div className="rx-history-loading">{[1,2].map((i) => <div key={i} className="rx-skeleton" />)}</div>
          ) : prescriptions.length === 0 ? (
            <div className="rx-empty"><FileText size={40} /><p>No prescriptions uploaded yet</p></div>
          ) : (
            <div className="rx-history-list">
              {prescriptions.map((rx) => {
                const cfg       = STATUS_CONFIG[rx.status] || STATUS_CONFIG.pending;
                const StatusIcon = cfg.icon;
                const dlvReq    = rx.deliveryRequest?.hostel ? rx.deliveryRequest : null;
                const dlvCfg    = dlvReq ? DELIVERY_REQUEST_STATUSES[dlvReq.status] : null;

                return (
                  <div key={rx._id} className="rx-history-card">

                    {/* Thumbnail */}
                    <div className="rx-history-thumb" onClick={() => setViewingRx(rx)}>
                      {rx.fileType === 'image'
                        ? <img src={rx.fileUrl} alt="Rx" />
                        : <div className="rx-pdf-thumb"><FileText size={24} /></div>
                      }
                      <div className="rx-history-overlay"><Eye size={16} /></div>
                    </div>

                    {/* Info */}
                    <div className="rx-history-info">
                      <div className="rx-history-id">{rx.prescriptionId}</div>
                      <div className="rx-history-date">
                        {new Date(rx.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric' })}
                      </div>
                      {rx.note && <div className="rx-history-note">{rx.note}</div>}

                      {/* Delivery request status */}
                      {dlvReq && dlvCfg && (
                        <div className="rx-delivery-status" style={{ color: dlvCfg.color, background: dlvCfg.bg }}>
                          <Truck size={12} />
                          <span>{dlvCfg.label} · {dlvReq.hostel}, {dlvReq.gate}</span>
                        </div>
                      )}

                      {/* Admin rejection note */}
                      {rx.status === 'rejected' && rx.adminNote && (
                        <div className="rx-reject-reason">Reason: {rx.adminNote}</div>
                      )}

                      {/* Order placed — prescription used */}
                      {rx.order && (
                        <div className="rx-used-badge"><CheckCircle size={11} /> Used for order</div>
                      )}
                    </div>

                    {/* Right column */}
                    <div className="rx-history-right">
                      <span className="rx-status-badge" style={{ color: cfg.color, background: cfg.bg }}>
                        <StatusIcon size={12} /> {cfg.label}
                      </span>

                      {/* Request Delivery — only on approved, unused, and no delivery request yet */}
                      {rx.status === 'approved' && isUnused(rx) && (
                        <button className="rx-delivery-btn" onClick={() => openDeliveryModal(rx)}>
                          <Truck size={13} /> Request Delivery
                        </button>
                      )}

                      {/* Delete — only pending */}
                      {rx.status === 'pending' && (
                        <button className="rx-delete-btn" onClick={() => handleDelete(rx._id)}>
                          <Trash2 size={14} />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ── Prescription lightbox ── */}
      {viewingRx && (
        <div className="rx-lightbox" onClick={() => setViewingRx(null)}>
          <button className="rx-lightbox-close"><XCircle size={28} /></button>
          <div className="rx-lightbox-content" onClick={(e) => e.stopPropagation()}>
            {viewingRx.fileType === 'image'
              ? <img src={viewingRx.fileUrl} alt="Prescription" />
              : <div className="rx-pdf-viewer">
                  <FileText size={64} />
                  <p>{viewingRx.fileName || 'Prescription PDF'}</p>
                  <a href={viewingRx.fileUrl} target="_blank" rel="noopener noreferrer" className="rx-pdf-open-btn">Open PDF</a>
                </div>
            }
            <div className="rx-lightbox-meta">
              <span>{viewingRx.prescriptionId}</span>
              <span className="rx-status-badge"
                style={{ color: STATUS_CONFIG[viewingRx.status]?.color, background: STATUS_CONFIG[viewingRx.status]?.bg }}>
                {STATUS_CONFIG[viewingRx.status]?.label}
              </span>
            </div>
            {viewingRx.adminNote && <p className="rx-lightbox-note">{viewingRx.adminNote}</p>}
          </div>
        </div>
      )}

      {/* ── Delivery Request Modal ── */}
      {deliveryModal && (
        <div className="modal-overlay" onClick={() => !dlvSubmitting && setDeliveryModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className="rx-dlv-modal-header">
              <div className="rx-dlv-modal-icon"><Truck size={26} /></div>
              <div>
                <h3 className="modal-title" style={{ textAlign:'left' }}>Request Medicine Delivery</h3>
                <p className="modal-sub" style={{ textAlign:'left' }}>
                  {deliveryModal.prescriptionId} · Our pharmacist will prepare your medicines
                </p>
              </div>
              <button className="rx-dlv-close" onClick={() => setDeliveryModal(null)}><X size={18} /></button>
            </div>

            <label className="rx-note-label">Hostel *</label>
            <select className="rx-note-input" style={{ padding:'10px 12px' }} value={dlvHostel} onChange={(e) => setDlvHostel(e.target.value)}>
              <option value="">Select your hostel</option>
              {HOSTEL_OPTIONS.map((h) => <option key={h} value={h}>{h}</option>)}
            </select>

            <label className="rx-note-label" style={{ marginTop:10 }}>Pickup Gate *</label>
            <select className="rx-note-input" style={{ padding:'10px 12px' }} value={dlvGate} onChange={(e) => setDlvGate(e.target.value)}>
              <option value="">Select gate</option>
              {GATE_OPTIONS.map((g) => <option key={g} value={g}>{g}</option>)}
            </select>

            <label className="rx-note-label" style={{ marginTop:10 }}>Note (optional)</label>
            <textarea className="rx-note-input" rows={2} maxLength={300}
              placeholder="Any specific requirement or timing preference..."
              value={dlvNote} onChange={(e) => setDlvNote(e.target.value)}
            />

            <div className="modal-actions" style={{ marginTop:14 }}>
              <button className="modal-cancel-btn" onClick={() => setDeliveryModal(null)} disabled={dlvSubmitting}>Cancel</button>
              <button className="modal-confirm-btn success" onClick={handleRequestDelivery} disabled={dlvSubmitting}>
                {dlvSubmitting ? 'Requesting...' : <><Truck size={15} /> Request Delivery</>}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionPage;
