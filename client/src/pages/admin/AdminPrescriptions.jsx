// Admin Prescriptions — review, attach medicines, clarification, partial approval

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  CheckCircle, XCircle, Clock, Eye, FileText, User, Calendar,
  MessageSquare, RefreshCw, Search, Plus, Trash2, AlertTriangle,
  ToggleLeft, ToggleRight,
} from 'lucide-react';
import toast from 'react-hot-toast';
import Loader from '../../components/common/Loader';
import {
  getAdminPrescriptions, reviewPrescription,
  attachMedicines, searchRxProducts,
} from '../../services/adminService';
const STATUS_CONFIG = {
  pending:                { label: 'Pending',              color: '#f59e0b', bg: '#fef3c7', icon: Clock },
  approved:               { label: 'Approved',             color: '#22c55e', bg: '#dcfce7', icon: CheckCircle },
  partially_approved:     { label: 'Partially Approved',   color: '#3b82f6', bg: '#eff6ff', icon: CheckCircle },
  rejected:               { label: 'Rejected',             color: '#ef4444', bg: '#fee2e2', icon: XCircle },
  clarification_required: { label: 'Clarification Needed', color: '#8b5cf6', bg: '#f5f3ff', icon: MessageSquare },
};

// ── Review modal ──────────────────────────────────────────────────────────────
const ReviewModal = ({ rx, onClose, onDone }) => {
  const [action,            setAction]           = useState('approved');
  const [adminNote,         setAdminNote]        = useState('');
  const [clarification,     setClarification]    = useState('');
  const [isReusable,        setIsReusable]       = useState(false);
  const [maxUsage,          setMaxUsage]         = useState(1);

  // Medicine attachment
  const [searchQ,           setSearchQ]          = useState('');
  const [searchResults,     setSearchResults]    = useState([]);
  const [searching,         setSearching]        = useState(false);
  const [approvedMedicines, setApprovedMedicines]= useState([]);  // [{ product, name, price, image, quantity }]
  const [rejectedMedicines, setRejectedMedicines]= useState([]);  // [{ name, reason }]
  const [rejectedInput,     setRejectedInput]    = useState({ name: '', reason: '' });
  const [submitting,        setSubmitting]       = useState(false);
  const searchTimer = useRef(null);

  const isApprovalAction = action === 'approved' || action === 'partially_approved';

  // Debounced product search
  const handleSearchChange = (q) => {
    setSearchQ(q);
    clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchRxProducts(q.trim());
        setSearchResults(res.data.data || []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 350);
  };

  const addMedicine = (product) => {
    if (approvedMedicines.find((m) => m.product === product._id)) return;
    setApprovedMedicines((prev) => [...prev, {
      product: product._id,
      name: product.name,
      price: product.price,
      image: product.image,
      quantity: 1,
    }]);
    setSearchQ('');
    setSearchResults([]);
  };

  const updateMedQty = (productId, qty) => {
    setApprovedMedicines((prev) =>
      prev.map((m) => m.product === productId ? { ...m, quantity: Math.max(1, parseInt(qty) || 1) } : m)
    );
  };

  const removeMed = (productId) => {
    setApprovedMedicines((prev) => prev.filter((m) => m.product !== productId));
  };

  const addRejected = () => {
    if (!rejectedInput.name.trim()) return;
    setRejectedMedicines((prev) => [...prev, { name: rejectedInput.name.trim(), reason: rejectedInput.reason.trim() }]);
    setRejectedInput({ name: '', reason: '' });
  };

  const removeRejected = (i) => setRejectedMedicines((prev) => prev.filter((_, idx) => idx !== i));

  const handleSubmit = async () => {
    if (action === 'rejected' && !adminNote.trim()) {
      toast.error('Provide a reason for rejection'); return;
    }
    if (action === 'clarification_required' && !clarification.trim()) {
      toast.error('Provide the clarification message'); return;
    }
    setSubmitting(true);
    try {
      const payload = {
        status: action,
        adminNote: adminNote.trim() || undefined,
        clarificationMessage: action === 'clarification_required' ? clarification.trim() : undefined,
        isReusable: isApprovalAction ? isReusable : undefined,
        maxUsage: isApprovalAction && isReusable ? maxUsage : undefined,
        approvedMedicines: isApprovalAction ? approvedMedicines : undefined,
        rejectedMedicines: action === 'partially_approved' ? rejectedMedicines : undefined,
      };
      await reviewPrescription(rx._id, payload);
      toast.success(`Prescription ${STATUS_CONFIG[action]?.label || action}`);
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={() => !submitting && onClose()}>
      <div className="admin-rx-review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-rx-review-header">
          <div>
            <div className="admin-rx-id">{rx.prescriptionId}</div>
            <div className="admin-rx-meta"><User size={12} /> {rx.user?.name || rx.user?.phone}</div>
          </div>
          <button className="rx-dlv-close" onClick={onClose}><XCircle size={20} /></button>
        </div>

        {/* Action selector */}
        <div className="admin-rx-action-row">
          {Object.entries(STATUS_CONFIG).filter(([k]) => k !== 'pending').map(([key, cfg]) => (
            <button
              key={key}
              className={`admin-rx-action-chip ${action === key ? 'selected' : ''}`}
              style={action === key ? { background: cfg.bg, borderColor: cfg.color, color: cfg.color } : {}}
              onClick={() => setAction(key)}
            >
              {key === 'approved' && <CheckCircle size={13} />}
              {key === 'partially_approved' && <CheckCircle size={13} />}
              {key === 'rejected' && <XCircle size={13} />}
              {key === 'clarification_required' && <MessageSquare size={13} />}
              {cfg.label}
            </button>
          ))}
        </div>

        {/* Clarification message */}
        {action === 'clarification_required' && (
          <div className="admin-rx-field">
            <label>Clarification message for patient <span className="req">*</span></label>
            <textarea className="modal-note-input" rows={3} maxLength={500}
              placeholder="Tell the patient what additional info is needed..."
              value={clarification} onChange={(e) => setClarification(e.target.value)}
            />
          </div>
        )}

        {/* Admin note (rejection reason / general) */}
        <div className="admin-rx-field">
          <label>{action === 'rejected' ? 'Rejection reason *' : 'Admin note (optional)'}</label>
          <textarea className="modal-note-input" rows={2} maxLength={500}
            placeholder={action === 'rejected' ? 'Reason for rejection...' : 'Add a note for the patient...'}
            value={adminNote} onChange={(e) => setAdminNote(e.target.value)}
          />
        </div>

        {/* Medicine attachment — only for approval actions */}
        {isApprovalAction && (
          <>
            <div className="admin-rx-field">
              <label>Attach approved medicines</label>
              <div className="admin-rx-search-wrap">
                <Search size={14} className="admin-rx-search-icon" />
                <input
                  className="admin-rx-search-input"
                  type="text"
                  placeholder="Search Rx medicines..."
                  value={searchQ}
                  onChange={(e) => handleSearchChange(e.target.value)}
                  autoComplete="off"
                />
              </div>
              {(searchResults.length > 0 || searching) && (
                <div className="admin-rx-search-dropdown">
                  {searching
                    ? <div className="admin-rx-search-loading">Searching...</div>
                    : searchResults.map((p) => (
                        <button key={p._id} className="admin-rx-search-result" onClick={() => addMedicine(p)}>
                          {p.image && <img src={p.image} alt="" className="admin-rx-search-img" />}
                          <span className="admin-rx-search-name">{p.name}</span>
                          <span className="admin-rx-search-price">₹{p.price}</span>
                          <Plus size={14} className="admin-rx-search-add" />
                        </button>
                      ))
                  }
                </div>
              )}
            </div>

            {approvedMedicines.length > 0 && (
              <div className="admin-rx-meds-list">
                <div className="admin-rx-meds-label">Approved medicines ({approvedMedicines.length})</div>
                {approvedMedicines.map((m) => (
                  <div key={m.product} className="admin-rx-med-row">
                    {m.image && <img src={m.image} alt="" className="admin-rx-med-img" />}
                    <span className="admin-rx-med-name">{m.name}</span>
                    <input
                      type="number" min={1} max={99}
                      className="admin-rx-med-qty"
                      value={m.quantity}
                      onChange={(e) => updateMedQty(m.product, e.target.value)}
                    />
                    <button className="admin-rx-med-remove" onClick={() => removeMed(m.product)}>
                      <Trash2 size={13} />
                    </button>
                  </div>
                ))}
              </div>
            )}

            {/* Reusable toggle */}
            <div className="admin-rx-field admin-rx-reusable-row">
              <span>Allow reuse</span>
              <button className="admin-rx-toggle" onClick={() => setIsReusable((v) => !v)}>
                {isReusable ? <ToggleRight size={22} className="toggle-on" /> : <ToggleLeft size={22} />}
              </button>
              {isReusable && (
                <div className="admin-rx-maxusage">
                  <label>Max uses</label>
                  <input type="number" min={1} max={12} value={maxUsage}
                    onChange={(e) => setMaxUsage(Math.max(1, parseInt(e.target.value) || 1))}
                    className="admin-rx-med-qty"
                  />
                </div>
              )}
            </div>
          </>
        )}

        {/* Rejected medicines — only for partial_approval */}
        {action === 'partially_approved' && (
          <div className="admin-rx-field">
            <label>Rejected medicines</label>
            <div className="admin-rx-rejected-input-row">
              <input className="admin-rx-search-input flex-1" placeholder="Medicine name"
                value={rejectedInput.name} onChange={(e) => setRejectedInput((v) => ({ ...v, name: e.target.value }))}
              />
              <input className="admin-rx-search-input flex-1" placeholder="Reason (optional)"
                value={rejectedInput.reason} onChange={(e) => setRejectedInput((v) => ({ ...v, reason: e.target.value }))}
              />
              <button className="admin-rx-add-rejected-btn" onClick={addRejected}><Plus size={14} /></button>
            </div>
            {rejectedMedicines.length > 0 && (
              <div className="admin-rx-rejected-list">
                {rejectedMedicines.map((m, i) => (
                  <div key={i} className="admin-rx-rejected-row">
                    <AlertTriangle size={12} className="text-danger" />
                    <span className="admin-rx-med-name">{m.name}</span>
                    {m.reason && <span className="admin-rx-rejected-reason">{m.reason}</span>}
                    <button className="admin-rx-med-remove" onClick={() => removeRejected(i)}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="modal-cancel-btn" onClick={onClose} disabled={submitting}>Cancel</button>
          <button
            className={`modal-confirm-btn ${['approved', 'partially_approved'].includes(action) ? 'success' : action === 'clarification_required' ? 'clarify' : 'danger'}`}
            onClick={handleSubmit}
            disabled={submitting}
          >
            {submitting ? 'Saving...' : `Submit — ${STATUS_CONFIG[action]?.label}`}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── AttachMedicinesModal ──────────────────────────────────────────────────────
const AttachModal = ({ rx, onClose, onDone }) => {
  const [searchQ,           setSearchQ]          = useState('');
  const [searchResults,     setSearchResults]    = useState([]);
  const [searching,         setSearching]        = useState(false);
  const [approvedMedicines, setApprovedMedicines]= useState(rx.approvedMedicines || []);
  const [rejectedMedicines, setRejectedMedicines]= useState(rx.rejectedMedicines || []);
  const [rejectedInput,     setRejectedInput]    = useState({ name: '', reason: '' });
  const [submitting,        setSubmitting]       = useState(false);
  const searchTimer = useRef(null);

  const handleSearchChange = (q) => {
    setSearchQ(q);
    clearTimeout(searchTimer.current);
    if (!q.trim()) { setSearchResults([]); return; }
    searchTimer.current = setTimeout(async () => {
      setSearching(true);
      try {
        const res = await searchRxProducts(q.trim());
        setSearchResults(res.data.data || []);
      } catch { setSearchResults([]); }
      finally { setSearching(false); }
    }, 350);
  };

  const addMedicine = (product) => {
    if (approvedMedicines.find((m) => (m.product?._id || m.product) === product._id)) return;
    setApprovedMedicines((prev) => [...prev, { product: product._id, name: product.name, price: product.price, image: product.image, quantity: 1 }]);
    setSearchQ(''); setSearchResults([]);
  };

  const updateQty = (id, qty) => {
    setApprovedMedicines((prev) => prev.map((m) => (m.product?._id || m.product) === id ? { ...m, quantity: Math.max(1, parseInt(qty) || 1) } : m));
  };

  const removeMed = (id) => setApprovedMedicines((prev) => prev.filter((m) => (m.product?._id || m.product) !== id));

  const addRejected = () => {
    if (!rejectedInput.name.trim()) return;
    setRejectedMedicines((prev) => [...prev, { name: rejectedInput.name.trim(), reason: rejectedInput.reason.trim() }]);
    setRejectedInput({ name: '', reason: '' });
  };

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await attachMedicines(rx._id, approvedMedicines, rejectedMedicines);
      toast.success('Medicines updated');
      onDone();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update medicines');
    } finally { setSubmitting(false); }
  };

  return (
    <div className="modal-overlay" onClick={() => !submitting && onClose()}>
      <div className="admin-rx-review-modal" onClick={(e) => e.stopPropagation()}>
        <div className="admin-rx-review-header">
          <div>
            <div className="admin-rx-id">{rx.prescriptionId}</div>
            <div className="admin-rx-meta"><User size={12} /> {rx.user?.name || rx.user?.phone}</div>
          </div>
          <button className="rx-dlv-close" onClick={onClose}><XCircle size={20} /></button>
        </div>
        <h4 style={{ fontWeight: 700, fontSize: '0.88rem', marginBottom: 8 }}>Update Attached Medicines</h4>

        <div className="admin-rx-field">
          <label>Search &amp; add medicines</label>
          <div className="admin-rx-search-wrap">
            <Search size={14} className="admin-rx-search-icon" />
            <input className="admin-rx-search-input" type="text" placeholder="Search Rx medicines..."
              value={searchQ} onChange={(e) => handleSearchChange(e.target.value)} autoComplete="off"
            />
          </div>
          {(searchResults.length > 0 || searching) && (
            <div className="admin-rx-search-dropdown">
              {searching ? <div className="admin-rx-search-loading">Searching...</div>
                : searchResults.map((p) => (
                    <button key={p._id} className="admin-rx-search-result" onClick={() => addMedicine(p)}>
                      {p.image && <img src={p.image} alt="" className="admin-rx-search-img" />}
                      <span className="admin-rx-search-name">{p.name}</span>
                      <span className="admin-rx-search-price">₹{p.price}</span>
                      <Plus size={14} className="admin-rx-search-add" />
                    </button>
                  ))
              }
            </div>
          )}
        </div>

        {approvedMedicines.length > 0 && (
          <div className="admin-rx-meds-list">
            <div className="admin-rx-meds-label">Approved ({approvedMedicines.length})</div>
            {approvedMedicines.map((m) => {
              const id = m.product?._id || m.product;
              return (
                <div key={id} className="admin-rx-med-row">
                  {m.image && <img src={m.image} alt="" className="admin-rx-med-img" />}
                  <span className="admin-rx-med-name">{m.name}</span>
                  <input type="number" min={1} max={99} className="admin-rx-med-qty"
                    value={m.quantity} onChange={(e) => updateQty(id, e.target.value)}
                  />
                  <button className="admin-rx-med-remove" onClick={() => removeMed(id)}><Trash2 size={13} /></button>
                </div>
              );
            })}
          </div>
        )}

        {rx.status === 'partially_approved' && (
          <div className="admin-rx-field">
            <label>Add rejected medicines</label>
            <div className="admin-rx-rejected-input-row">
              <input className="admin-rx-search-input flex-1" placeholder="Medicine name"
                value={rejectedInput.name} onChange={(e) => setRejectedInput((v) => ({ ...v, name: e.target.value }))}
              />
              <input className="admin-rx-search-input flex-1" placeholder="Reason"
                value={rejectedInput.reason} onChange={(e) => setRejectedInput((v) => ({ ...v, reason: e.target.value }))}
              />
              <button className="admin-rx-add-rejected-btn" onClick={addRejected}><Plus size={14} /></button>
            </div>
            {rejectedMedicines.length > 0 && (
              <div className="admin-rx-rejected-list">
                {rejectedMedicines.map((m, i) => (
                  <div key={i} className="admin-rx-rejected-row">
                    <AlertTriangle size={12} className="text-danger" />
                    <span className="admin-rx-med-name">{m.name}</span>
                    {m.reason && <span className="admin-rx-rejected-reason">{m.reason}</span>}
                    <button className="admin-rx-med-remove" onClick={() => setRejectedMedicines((p) => p.filter((_, idx) => idx !== i))}><Trash2 size={12} /></button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div className="modal-actions">
          <button className="modal-cancel-btn" onClick={onClose} disabled={submitting}>Cancel</button>
          <button className="modal-confirm-btn success" onClick={handleSubmit} disabled={submitting}>
            {submitting ? 'Saving...' : 'Save Medicines'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ── Main page ─────────────────────────────────────────────────────────────────
const AdminPrescriptions = () => {
  const [prescriptions,  setPrescriptions] = useState([]);
  const [loading,        setLoading]       = useState(true);
  const [statusFilter,   setStatusFilter]  = useState('pending');
  const [dateFilter,     setDateFilter]    = useState('');
  const [viewing,        setViewing]       = useState(null);
  const [reviewingRx,    setReviewingRx]   = useState(null);
  const [attachingRx,    setAttachingRx]   = useState(null);
  const [total,          setTotal]         = useState(0);

  const fetchPrescriptions = useCallback(async () => {
    setLoading(true);
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (dateFilter)   params.date   = dateFilter;
      const res = await getAdminPrescriptions(params);
      setPrescriptions(res.data.data.prescriptions || []);
      setTotal(res.data.data.total || 0);
    } catch {
      toast.error('Failed to load prescriptions');
    } finally {
      setLoading(false);
    }
  }, [statusFilter, dateFilter]);

  useEffect(() => { fetchPrescriptions(); }, [fetchPrescriptions]);

  const handleDone = () => {
    setReviewingRx(null);
    setAttachingRx(null);
    setViewing(null);
    fetchPrescriptions();
  };

  const pendingCount = prescriptions.filter((p) => p.status === 'pending').length;

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h2>Prescriptions</h2>
          {pendingCount > 0 && statusFilter === 'pending' && (
            <span className="admin-rx-pending-badge">{pendingCount} awaiting review</span>
          )}
        </div>
        <button className="admin-refresh-btn" onClick={fetchPrescriptions} title="Refresh">
          <RefreshCw size={16} />
        </button>
      </div>

      {/* Filters */}
      <div className="filter-bar">
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="input">
          <option value="">All</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="partially_approved">Partially Approved</option>
          <option value="rejected">Rejected</option>
          <option value="clarification_required">Needs Clarification</option>
        </select>
        <select value={dateFilter} onChange={(e) => setDateFilter(e.target.value)} className="input">
          <option value="">All Time</option>
          <option value="today">Today</option>
        </select>
        <span className="admin-rx-count">{total} total</span>
      </div>

      {loading ? <Loader /> : prescriptions.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">📋</span>
          <h3>No prescriptions found</h3>
          <p>Adjust filters to see more results</p>
        </div>
      ) : (
        <div className="admin-rx-grid">
          {prescriptions.map((rx) => {
            const cfg        = STATUS_CONFIG[rx.status] || STATUS_CONFIG.pending;
            const StatusIcon = cfg.icon;
            const isReviewable = rx.status === 'pending' || rx.status === 'clarification_required';
            const isApproved   = rx.status === 'approved' || rx.status === 'partially_approved';

            return (
              <div key={rx._id} className="admin-rx-card">

                {/* Thumbnail */}
                <div className="admin-rx-thumb" onClick={() => setViewing(rx)}>
                  {rx.fileType === 'image'
                    ? <img src={rx.fileUrl} alt="Prescription" />
                    : <div className="admin-rx-pdf-thumb"><FileText size={32} /><span>PDF</span></div>
                  }
                  <div className="admin-rx-thumb-overlay"><Eye size={18} /></div>
                </div>

                {/* Info */}
                <div className="admin-rx-info">
                  <div className="admin-rx-id">{rx.prescriptionId}</div>
                  <div className="admin-rx-meta"><User size={12} /><span>{rx.user?.name || rx.user?.phone || 'Unknown'}</span></div>
                  {rx.user?.hostel && (
                    <div className="admin-rx-meta"><span className="admin-rx-hostel">{rx.user.hostel}</span></div>
                  )}
                  <div className="admin-rx-meta">
                    <Calendar size={12} />
                    <span>{new Date(rx.createdAt).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                  {rx.note && (
                    <div className="admin-rx-note"><MessageSquare size={12} /><span>{rx.note}</span></div>
                  )}

                  {/* Clarification message */}
                  {rx.clarificationMessage && (
                    <div className="admin-rx-clarify-note">
                      <MessageSquare size={11} /> {rx.clarificationMessage}
                    </div>
                  )}

                  {/* Attached medicines preview */}
                  {isApproved && (rx.approvedMedicines || []).length > 0 && (
                    <div className="admin-rx-meds-preview">
                      {rx.approvedMedicines.map((m, i) => (
                        <span key={i} className="admin-rx-med-chip">{m.name}</span>
                      ))}
                    </div>
                  )}

                  {/* Admin note */}
                  {rx.adminNote && (
                    <div className="admin-rx-admin-note">Note: {rx.adminNote}</div>
                  )}

                  {/* Reusability */}
                  {isApproved && rx.isReusable && (
                    <div className="admin-rx-reuse-badge">
                      Reusable · {rx.usageCount || 0}/{rx.maxUsage} uses
                    </div>
                  )}
                </div>

                {/* Footer */}
                <div className="admin-rx-footer">
                  <span className="rx-status-badge" style={{ color: cfg.color, background: cfg.bg }}>
                    <StatusIcon size={12} /> {cfg.label}
                  </span>

                  <div className="admin-rx-actions">
                    {isReviewable && (
                      <button className="admin-rx-approve-btn" onClick={() => setReviewingRx(rx)}>
                        <CheckCircle size={14} /> Review
                      </button>
                    )}
                    {isApproved && (
                      <button className="admin-rx-approve-btn" style={{ background: '#eff6ff', color: '#1d4ed8' }}
                        onClick={() => setAttachingRx(rx)}>
                        <Plus size={14} /> Edit Medicines
                      </button>
                    )}
                    {(rx.status === 'rejected' || rx.status === 'clarification_required') && (
                      <button className="admin-rx-approve-btn" onClick={() => setReviewingRx(rx)}>
                        <RefreshCw size={14} /> Re-review
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Lightbox viewer */}
      {viewing && (
        <div className="rx-lightbox" onClick={() => setViewing(null)}>
          <button className="rx-lightbox-close" onClick={() => setViewing(null)}><XCircle size={28} /></button>
          <div className="rx-lightbox-content" onClick={(e) => e.stopPropagation()}>
            {viewing.fileType === 'image'
              ? <img src={viewing.fileUrl} alt="Prescription" />
              : <div className="rx-pdf-viewer">
                  <FileText size={64} />
                  <p>{viewing.fileName || 'Prescription PDF'}</p>
                  <a href={viewing.fileUrl} target="_blank" rel="noopener noreferrer" className="rx-pdf-open-btn">Open PDF</a>
                </div>
            }
            <div className="rx-lightbox-meta">
              <div>
                <strong>{viewing.prescriptionId}</strong>
                <span style={{ marginLeft: 8, color: 'var(--text-secondary)' }}>
                  {viewing.user?.name || viewing.user?.phone}
                  {viewing.user?.hostel ? ` · ${viewing.user.hostel}` : ''}
                </span>
              </div>
              <span className="rx-status-badge"
                style={{ color: STATUS_CONFIG[viewing.status]?.color, background: STATUS_CONFIG[viewing.status]?.bg }}>
                {STATUS_CONFIG[viewing.status]?.label}
              </span>
            </div>
            {viewing.note && <p className="rx-lightbox-note">Note: {viewing.note}</p>}
            {viewing.clarificationMessage && (
              <p className="rx-lightbox-note" style={{ color: '#7c3aed' }}>
                Clarification: {viewing.clarificationMessage}
              </p>
            )}
            {(viewing.status === 'pending' || viewing.status === 'clarification_required') && (
              <div className="rx-lightbox-actions">
                <button className="admin-rx-approve-btn lg"
                  onClick={() => { setViewing(null); setReviewingRx(viewing); }}>
                  <CheckCircle size={16} /> Review
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewingRx && (
        <ReviewModal rx={reviewingRx} onClose={() => setReviewingRx(null)} onDone={handleDone} />
      )}

      {/* Attach medicines modal */}
      {attachingRx && (
        <AttachModal rx={attachingRx} onClose={() => setAttachingRx(null)} onDone={handleDone} />
      )}
    </div>
  );
};

export default AdminPrescriptions;
