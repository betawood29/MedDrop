// Prescription upload page — users upload Rx prescriptions for medicine orders
// Flow: upload image/PDF → pending → admin approves → order can be delivered

import { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ArrowLeft, Upload, FileText, Image, CheckCircle, XCircle, Clock,
  Trash2, Eye, PhoneCall, MessageSquare, ShieldCheck, ChevronRight, Plus
} from 'lucide-react';
import toast from 'react-hot-toast';
import { uploadPrescription, getMyPrescriptions, deletePrescription } from '../services/prescriptionService';

const STATUS_CONFIG = {
  pending: { label: 'Under Review', color: '#f59e0b', bg: '#fef3c7', icon: Clock },
  approved: { label: 'Approved', color: '#22c55e', bg: '#dcfce7', icon: CheckCircle },
  rejected: { label: 'Rejected', color: '#ef4444', bg: '#fee2e2', icon: XCircle },
};

const PrescriptionPage = () => {
  const navigate = useNavigate();
  const fileInputRef = useRef(null);

  const [prescriptions, setPrescriptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [uploading, setUploading] = useState(false);
  const [selectedFile, setSelectedFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [note, setNote] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [showGuide, setShowGuide] = useState(false);
  const [viewingPrescription, setViewingPrescription] = useState(null);

  const fetchPrescriptions = useCallback(async () => {
    try {
      const res = await getMyPrescriptions();
      setPrescriptions(res.data.data || []);
    } catch {
      // silent
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  const handleFileSelect = (file) => {
    if (!file) return;
    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    if (!allowed.includes(file.type)) {
      toast.error('Only JPG, PNG, or PDF files are allowed');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      toast.error('File size must be under 10 MB');
      return;
    }
    setSelectedFile(file);
    if (file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onload = (e) => setPreview(e.target.result);
      reader.readAsDataURL(file);
    } else {
      setPreview('pdf');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const file = e.dataTransfer.files[0];
    if (file) handleFileSelect(file);
  };

  const handleUpload = async () => {
    if (!selectedFile) return;
    setUploading(true);
    try {
      const formData = new FormData();
      formData.append('prescription', selectedFile);
      if (note.trim()) formData.append('note', note.trim());
      await uploadPrescription(formData);
      toast.success('Prescription uploaded! Our pharmacist will review it shortly.');
      setSelectedFile(null);
      setPreview(null);
      setNote('');
      fetchPrescriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed. Please try again.');
    } finally {
      setUploading(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this prescription?')) return;
    try {
      await deletePrescription(id);
      toast.success('Prescription deleted');
      setPrescriptions((prev) => prev.filter((p) => p._id !== id));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Could not delete');
    }
  };

  const clearSelected = () => {
    setSelectedFile(null);
    setPreview(null);
    setNote('');
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  return (
    <div className="rx-page">
      {/* Header */}
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
          <div className="rx-trust-item">
            <ShieldCheck size={16} className="rx-trust-icon" />
            <span>Encrypted & Secure</span>
          </div>
          <div className="rx-trust-item">
            <CheckCircle size={16} className="rx-trust-icon" />
            <span>Verified by Pharmacist</span>
          </div>
          <div className="rx-trust-item">
            <Clock size={16} className="rx-trust-icon" />
            <span>Quick Review</span>
          </div>
        </div>

        {/* Upload card */}
        <div className="rx-upload-card">
          <div
            className={`rx-drop-zone ${dragOver ? 'drag-over' : ''} ${selectedFile ? 'has-file' : ''}`}
            onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
            onDragLeave={() => setDragOver(false)}
            onDrop={handleDrop}
            onClick={() => !selectedFile && fileInputRef.current?.click()}
          >
            {!selectedFile ? (
              <div className="rx-drop-empty">
                <div className="rx-drop-icon-wrap">
                  <Upload size={32} />
                </div>
                <p className="rx-drop-title">Upload Prescription</p>
                <p className="rx-drop-hint">Drag & drop here or <span className="rx-link">browse files</span></p>
                <p className="rx-drop-formats">JPG, PNG, PDF • Max 10 MB</p>
              </div>
            ) : (
              <div className="rx-preview-wrap">
                {preview === 'pdf' ? (
                  <div className="rx-pdf-preview">
                    <FileText size={48} />
                    <span>{selectedFile.name}</span>
                  </div>
                ) : (
                  <img src={preview} alt="Prescription preview" className="rx-img-preview" />
                )}
                <button
                  className="rx-clear-btn"
                  onClick={(e) => { e.stopPropagation(); clearSelected(); }}
                  title="Remove"
                >
                  <XCircle size={22} />
                </button>
              </div>
            )}
          </div>

          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/jpg,image/png,application/pdf"
            style={{ display: 'none' }}
            onChange={(e) => handleFileSelect(e.target.files[0])}
          />

          {selectedFile && (
            <div className="rx-note-section">
              <label className="rx-note-label">Add a note (optional)</label>
              <textarea
                className="rx-note-input"
                placeholder="e.g. For cough medicine, prescribed by Dr. Sharma..."
                value={note}
                onChange={(e) => setNote(e.target.value)}
                maxLength={500}
                rows={2}
              />
              <button
                className="rx-upload-btn"
                onClick={handleUpload}
                disabled={uploading}
              >
                {uploading ? (
                  <span className="rx-uploading">
                    <span className="rx-spinner" /> Uploading...
                  </span>
                ) : (
                  <>
                    <Upload size={18} /> Upload Prescription
                  </>
                )}
              </button>
            </div>
          )}

          {/* What is a valid prescription */}
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
          <span className="rx-or-line" />
          <span className="rx-or-text">OR</span>
          <span className="rx-or-line" />
        </div>

        {/* Consult options */}
        <div className="rx-consult-section">
          <p className="rx-consult-heading">Don't have a prescription?</p>
          <div className="rx-consult-cards">
            <a href="tel:+911234567890" className="rx-consult-card">
              <div className="rx-consult-icon phone">
                <PhoneCall size={22} />
              </div>
              <div className="rx-consult-info">
                <span className="rx-consult-title">Call Pharmacist</span>
                <span className="rx-consult-sub">Get guidance on medicines</span>
              </div>
              <ChevronRight size={16} className="rx-consult-arrow" />
            </a>
            <button className="rx-consult-card" onClick={() => navigate('/suggestions')}>
              <div className="rx-consult-icon chat">
                <MessageSquare size={22} />
              </div>
              <div className="rx-consult-info">
                <span className="rx-consult-title">Consult via Message</span>
                <span className="rx-consult-sub">Send us a query or suggestion</span>
              </div>
              <ChevronRight size={16} className="rx-consult-arrow" />
            </button>
          </div>
        </div>

        {/* My prescriptions */}
        <div className="rx-history-section">
          <h2 className="rx-history-title">My Prescriptions</h2>

          {loading ? (
            <div className="rx-history-loading">
              {[1, 2].map((i) => <div key={i} className="rx-skeleton" />)}
            </div>
          ) : prescriptions.length === 0 ? (
            <div className="rx-empty">
              <FileText size={40} />
              <p>No prescriptions uploaded yet</p>
            </div>
          ) : (
            <div className="rx-history-list">
              {prescriptions.map((rx) => {
                const cfg = STATUS_CONFIG[rx.status] || STATUS_CONFIG.pending;
                const StatusIcon = cfg.icon;
                return (
                  <div key={rx._id} className="rx-history-card">
                    <div className="rx-history-thumb" onClick={() => setViewingPrescription(rx)}>
                      {rx.fileType === 'image' ? (
                        <img src={rx.fileUrl} alt="Rx" />
                      ) : (
                        <div className="rx-pdf-thumb">
                          <FileText size={24} />
                        </div>
                      )}
                      <div className="rx-history-overlay"><Eye size={16} /></div>
                    </div>
                    <div className="rx-history-info">
                      <div className="rx-history-id">{rx.prescriptionId}</div>
                      <div className="rx-history-date">
                        {new Date(rx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </div>
                      {rx.note && <div className="rx-history-note">{rx.note}</div>}
                      {rx.adminNote && rx.status === 'rejected' && (
                        <div className="rx-reject-reason">Reason: {rx.adminNote}</div>
                      )}
                    </div>
                    <div className="rx-history-right">
                      <span
                        className="rx-status-badge"
                        style={{ color: cfg.color, background: cfg.bg }}
                      >
                        <StatusIcon size={12} />
                        {cfg.label}
                      </span>
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

      {/* Lightbox viewer */}
      {viewingPrescription && (
        <div className="rx-lightbox" onClick={() => setViewingPrescription(null)}>
          <button className="rx-lightbox-close"><XCircle size={28} /></button>
          <div className="rx-lightbox-content" onClick={(e) => e.stopPropagation()}>
            {viewingPrescription.fileType === 'image' ? (
              <img src={viewingPrescription.fileUrl} alt="Prescription" />
            ) : (
              <div className="rx-pdf-viewer">
                <FileText size={64} />
                <p>{viewingPrescription.fileName || 'Prescription PDF'}</p>
                <a
                  href={viewingPrescription.fileUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="rx-pdf-open-btn"
                >
                  Open PDF
                </a>
              </div>
            )}
            <div className="rx-lightbox-meta">
              <span>{viewingPrescription.prescriptionId}</span>
              <span
                className="rx-status-badge"
                style={{
                  color: STATUS_CONFIG[viewingPrescription.status]?.color,
                  background: STATUS_CONFIG[viewingPrescription.status]?.bg,
                }}
              >
                {STATUS_CONFIG[viewingPrescription.status]?.label}
              </span>
            </div>
            {viewingPrescription.adminNote && (
              <p className="rx-lightbox-note">{viewingPrescription.adminNote}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default PrescriptionPage;
