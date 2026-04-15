// Prescription page — upload + status tracking + pre-fill cart from approved medicines
// Progress stepper: Uploaded → Under Review → [Clarification] → Approved / Rejected

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, FileText, CheckCircle, XCircle, Clock,
  Trash2, Eye, PhoneCall, MessageSquare, ShieldCheck, ChevronRight,
  ShoppingCart, AlertTriangle, RefreshCw, Info,
} from 'lucide-react';
import toast from 'react-hot-toast';
import {
  uploadPrescription, reuploadPrescription, getMyPrescriptions, deletePrescription,
} from '../services/prescriptionService';
import { useCart } from '../hooks/useCart';

// ── stepper config ────────────────────────────────────────────────────────────
const STEPS = [
  { key: 'uploaded',  label: 'Uploaded' },
  { key: 'review',    label: 'Under Review' },
  { key: 'decision',  label: 'Decision' },
];

const getStepState = (status) => {
  // returns [0-based index of active step, whether it completed or not]
  if (!status || status === 'pending')                return { active: 1 };
  if (status === 'clarification_required')            return { active: 1, clarification: true };
  if (status === 'approved' || status === 'partially_approved') return { active: 2, done: true };
  if (status === 'rejected')                          return { active: 2, rejected: true };
  return { active: 0 };
};

// ── per-status card config ────────────────────────────────────────────────────
const STATUS_CONFIG = {
  pending:                { label: 'Under Review',       color: '#f59e0b', bg: '#fef3c7', icon: Clock },
  approved:               { label: 'Approved',           color: '#22c55e', bg: '#dcfce7', icon: CheckCircle },
  partially_approved:     { label: 'Partially Approved', color: '#3b82f6', bg: '#eff6ff', icon: CheckCircle },
  rejected:               { label: 'Rejected',           color: '#ef4444', bg: '#fee2e2', icon: AlertTriangle },
  clarification_required: { label: 'Clarification Needed', color: '#8b5cf6', bg: '#f5f3ff', icon: MessageSquare },
};

const PrescriptionPage = () => {
  const navigate     = useNavigate();
  const { addItem }  = useCart();
  const fileInputRef = useRef(null);

  const uploadCardRef = useRef(null);

  const [prescriptions,   setPrescriptions]   = useState([]);
  const [loading,         setLoading]         = useState(true);
  const [uploading,       setUploading]       = useState(false);
  const [selectedFile,    setSelectedFile]    = useState(null);
  const [preview,         setPreview]         = useState(null);
  const [note,            setNote]            = useState('');
  const [dragOver,        setDragOver]        = useState(false);
  const [showGuide,       setShowGuide]       = useState(false);
  const [viewingRx,       setViewingRx]       = useState(null);
  // When set, upload replaces this prescription instead of creating a new one
  const [reuploadTarget,  setReuploadTarget]  = useState(null); // { id, prescriptionId, reason }

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
    if (!['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'].includes(file.type)) {
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
      if (reuploadTarget) {
        await reuploadPrescription(reuploadTarget.id, fd);
        toast.success('Prescription updated! Our pharmacist will review it shortly.');
        setReuploadTarget(null);
      } else {
        await uploadPrescription(fd);
        toast.success('Prescription uploaded! Our pharmacist will review it shortly.');
      }
      clearSelected();
      fetchPrescriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally { setUploading(false); }
  };

  const startReupload = (rx) => {
    setReuploadTarget({ id: rx._id, prescriptionId: rx.prescriptionId, reason: rx.status });
    clearSelected();
    uploadCardRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this prescription?')) return;
    try {
      await deletePrescription(id);
      toast.success('Prescription deleted');
      setPrescriptions((p) => p.filter((x) => x._id !== id));
    } catch (err) { toast.error(err.response?.data?.message || 'Could not delete'); }
  };

  /* ── pre-fill cart from approved medicines ── */
  const handlePreFillCart = (rx) => {
    const medicines = rx.approvedMedicines || [];
    if (medicines.length === 0) {
      toast('Add your prescribed medicines to cart, then checkout!', { icon: '💊', duration: 4000 });
      navigate('/');
      return;
    }
    medicines.forEach((m) => {
      addItem(
        {
          _id: m.product,
          name: m.name,
          price: m.price,
          image: m.image,
          stockQty: 0,           // 0 = no stock limit in addItem
          requiresPrescription: true,
        },
        m.quantity || 1,
      );
    });
    toast.success(`${medicines.length} medicine${medicines.length !== 1 ? 's' : ''} added to cart!`);
    navigate('/cart');
  };

  return (
    <div className="rx-page">

      {/* ── Header ── */}
      <div className="rx-header">
        <button className="rx-back-btn" onClick={() => navigate(-1)}>
          <ArrowLeft size={20} />
        </button>
        <div>
          <h1 className="rx-title">Prescriptions</h1>
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
        <div className="rx-upload-card" ref={uploadCardRef}>
          {/* Re-upload context banner */}
          {reuploadTarget && (
            <div className="rx-reupload-banner">
              <RefreshCw size={14} />
              <span>
                Updating <strong>{reuploadTarget.prescriptionId}</strong> —
                {reuploadTarget.reason === 'clarification_required'
                  ? ' upload a clearer photo to address the pharmacist\'s request'
                  : ' upload a new prescription to replace the rejected one'}
              </span>
              <button
                className="rx-reupload-cancel"
                onClick={() => { setReuploadTarget(null); clearSelected(); }}
              >
                Cancel
              </button>
            </div>
          )}

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
                <p className="rx-drop-formats">JPG, PNG, PDF · Max 10 MB</p>
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
              <div className="rx-guide-item"><CheckCircle size={14} /><span>Doctor&apos;s name, signature &amp; stamp</span></div>
              <div className="rx-guide-item"><CheckCircle size={14} /><span>Patient name &amp; date</span></div>
              <div className="rx-guide-item"><CheckCircle size={14} /><span>Medicine name, dose &amp; duration</span></div>
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
          <p className="rx-consult-heading">Don&apos;t have a prescription?</p>
          <div className="rx-consult-cards">
            <a href="tel:+919914866244" className="rx-consult-card">
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
          <div className="rx-history-heading-row">
            <h2 className="rx-history-title">My Prescriptions</h2>
            <button className="rx-refresh-btn" onClick={fetchPrescriptions} title="Refresh">
              <RefreshCw size={14} />
            </button>
          </div>

          {loading ? (
            <div className="rx-history-loading">{[1, 2].map((i) => <div key={i} className="rx-skeleton" />)}</div>
          ) : prescriptions.length === 0 ? (
            <div className="rx-empty"><FileText size={40} /><p>No prescriptions uploaded yet</p></div>
          ) : (
            <div className="rx-history-list">
              {prescriptions.map((rx) => {
                const cfg        = STATUS_CONFIG[rx.status] || STATUS_CONFIG.pending;
                const StatusIcon = cfg.icon;
                const stepState  = getStepState(rx.status);
                const hasApprovedMeds = (rx.approvedMedicines || []).length > 0;
                const isApprovedOrPartial = ['approved', 'partially_approved'].includes(rx.status);
                const isReusable = rx.isReusable;
                const expiresAt  = rx.expiresAt ? new Date(rx.expiresAt) : null;
                const isExpired  = expiresAt && expiresAt < new Date();

                return (
                  <div key={rx._id} className={`rx-history-card${isApprovedOrPartial && !isExpired ? ' rx-history-card-approved' : ''}`}>

                    {/* ── Progress Stepper ── */}
                    <div className="rx-stepper">
                      {STEPS.map((step, i) => {
                        const isDone   = i < stepState.active;
                        const isActive = i === stepState.active;
                        const isClarify  = isActive && stepState.clarification;
                        const isRejected = isActive && stepState.rejected;
                        return (
                          <div key={step.key} className="rx-step-item">
                            <div className={`rx-step-circle ${isDone ? 'done' : ''} ${isActive && !isClarify && !isRejected ? 'active' : ''} ${isClarify ? 'clarify' : ''} ${isRejected ? 'rejected' : ''}`}>
                              {isDone ? <CheckCircle size={13} /> : isRejected ? <XCircle size={13} /> : i + 1}
                            </div>
                            <span className={`rx-step-label ${isActive ? 'active' : ''}`}>
                              {i === 2 && stepState.rejected ? 'Rejected' : i === 2 && stepState.done ? 'Approved' : i === 1 && isClarify ? 'Clarify' : step.label}
                            </span>
                            {i < STEPS.length - 1 && <div className={`rx-step-line ${isDone ? 'done' : ''}`} />}
                          </div>
                        );
                      })}
                    </div>

                    {/* ── Card body ── */}
                    <div className="rx-history-body">
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
                          {new Date(rx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </div>
                        {rx.note && <div className="rx-history-note">{rx.note}</div>}

                        {/* Clarification message from admin */}
                        {rx.status === 'clarification_required' && rx.clarificationMessage && (
                          <div className="rx-clarification-box">
                            <MessageSquare size={13} />
                            <div>
                              <strong>Pharmacist says:</strong>
                              <p>{rx.clarificationMessage}</p>
                            </div>
                          </div>
                        )}

                        {/* Clarification → quick consult shortcuts */}
                        {rx.status === 'clarification_required' && (
                          <div className="rx-clarify-actions">
                            <span className="rx-clarify-label">Need help clarifying?</span>
                            <a href="tel:+919914866244" className="rx-clarify-btn call">
                              <PhoneCall size={13} /> Call Pharmacist
                            </a>
                            <button className="rx-clarify-btn msg" onClick={() => navigate('/suggestions')}>
                              <MessageSquare size={13} /> Send Message
                            </button>
                          </div>
                        )}

                        {/* Rejection reason */}
                        {rx.status === 'rejected' && rx.adminNote && (
                          <div className="rx-reject-reason">
                            <AlertTriangle size={12} /> Reason: {rx.adminNote}
                          </div>
                        )}

                        {/* Expiry & reusability info */}
                        {isApprovedOrPartial && expiresAt && (
                          <div className={`rx-expiry-info ${isExpired ? 'expired' : ''}`}>
                            <Info size={12} />
                            {isExpired ? 'Expired' : `Valid until ${expiresAt.toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}`}
                            {isReusable && !isExpired && rx.maxUsage > 0 && (
                              <span className="rx-usage-badge">
                                {rx.usageCount || 0}/{rx.maxUsage} uses
                              </span>
                            )}
                          </div>
                        )}

                        {/* Approved medicines list */}
                        {isApprovedOrPartial && hasApprovedMeds && (
                          <div className="rx-approved-meds">
                            <span className="rx-approved-meds-label">Approved medicines:</span>
                            {rx.approvedMedicines.map((m, idx) => (
                              <span key={idx} className="rx-med-pill">{m.name}</span>
                            ))}
                          </div>
                        )}

                        {/* Rejected medicines */}
                        {rx.status === 'partially_approved' && (rx.rejectedMedicines || []).length > 0 && (
                          <div className="rx-rejected-meds">
                            {rx.rejectedMedicines.map((m, idx) => (
                              <span key={idx} className="rx-med-pill rejected">{m.name}</span>
                            ))}
                          </div>
                        )}

                        {/* Order placed */}
                        {rx.order && (
                          <div className="rx-used-badge"><CheckCircle size={11} /> Used for order</div>
                        )}
                      </div>

                      {/* Right column */}
                      <div className="rx-history-right">
                        <span className="rx-status-badge" style={{ color: cfg.color, background: cfg.bg }}>
                          <StatusIcon size={12} /> {cfg.label}
                        </span>

                        {/* Approved + not expired + not used → start order */}
                        {isApprovedOrPartial && !rx.order && !isExpired && (
                          <button className="rx-delivery-btn" onClick={() => handlePreFillCart(rx)}>
                            <ShoppingCart size={13} />
                            {hasApprovedMeds ? 'Fill Cart' : 'Order Medicines'}
                          </button>
                        )}

                        {/* Clarification → re-upload same prescription */}
                        {rx.status === 'clarification_required' && (
                          <button
                            className="rx-delivery-btn"
                            style={{ background: '#7c3aed' }}
                            onClick={() => startReupload(rx)}
                          >
                            <Upload size={13} /> Re-upload
                          </button>
                        )}

                        {/* Rejected → replace file on same prescription */}
                        {rx.status === 'rejected' && (
                          <button
                            className="rx-delivery-btn"
                            style={{ background: '#dc2626' }}
                            onClick={() => startReupload(rx)}
                          >
                            <Upload size={13} /> Re-submit
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
            {viewingRx.clarificationMessage && (
              <p className="rx-lightbox-note" style={{ color: '#7c3aed' }}>
                Pharmacist: {viewingRx.clarificationMessage}
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionPage;
