// Admin Prescriptions page — review prescriptions + manage delivery requests

import { useState, useEffect, useCallback } from 'react';
import {
  CheckCircle, XCircle, Clock, Eye, FileText, User, Calendar,
  MessageSquare, RefreshCw, Truck, MapPin
} from 'lucide-react';
import toast from 'react-hot-toast';
import Loader from '../../components/common/Loader';
import { getAdminPrescriptions, reviewPrescription, updatePrescriptionDelivery } from '../../services/adminService';
import { DELIVERY_REQUEST_STATUSES } from '../../utils/constants';

const STATUS_CONFIG = {
  pending:  { label: 'Pending',  color: '#f59e0b', bg: '#fef3c7', icon: Clock },
  approved: { label: 'Approved', color: '#22c55e', bg: '#dcfce7', icon: CheckCircle },
  rejected: { label: 'Rejected', color: '#ef4444', bg: '#fee2e2', icon: XCircle },
};

const AdminPrescriptions = () => {
  const [prescriptions, setPrescriptions] = useState([]);
  const [loading,       setLoading]       = useState(true);
  const [statusFilter,  setStatusFilter]  = useState('pending');
  const [dateFilter,    setDateFilter]    = useState('');
  const [viewing,       setViewing]       = useState(null);
  const [reviewModal,   setReviewModal]   = useState(null); // { rx, action }
  const [adminNote,     setAdminNote]     = useState('');
  const [submitting,    setSubmitting]    = useState(false);
  const [total,         setTotal]         = useState(0);

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

  /* ── review (approve / reject) ── */
  const openReview = (rx, action) => { setReviewModal({ rx, action }); setAdminNote(''); };

  const handleReview = async () => {
    if (!reviewModal) return;
    if (reviewModal.action === 'rejected' && !adminNote.trim()) {
      toast.error('Please provide a reason for rejection'); return;
    }
    setSubmitting(true);
    try {
      await reviewPrescription(reviewModal.rx._id, reviewModal.action, adminNote.trim());
      toast.success(`Prescription ${reviewModal.action}`);
      setReviewModal(null); setViewing(null);
      fetchPrescriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update');
    } finally { setSubmitting(false); }
  };

  /* ── delivery status ── */
  const handleDeliveryStatus = async (rx, status) => {
    try {
      await updatePrescriptionDelivery(rx._id, status);
      toast.success(`Delivery status: ${DELIVERY_REQUEST_STATUSES[status]?.label}`);
      fetchPrescriptions();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Failed to update delivery');
    }
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
          <option value="rejected">Rejected</option>
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
            const dlvReq     = rx.deliveryRequest?.hostel ? rx.deliveryRequest : null;
            const dlvCfg     = dlvReq ? DELIVERY_REQUEST_STATUSES[dlvReq.status] : null;

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
                    <span>{new Date(rx.createdAt).toLocaleDateString('en-IN', { day:'numeric', month:'short', year:'numeric', hour:'2-digit', minute:'2-digit' })}</span>
                  </div>
                  {rx.note && (
                    <div className="admin-rx-note"><MessageSquare size={12} /><span>{rx.note}</span></div>
                  )}

                  {/* Delivery request section */}
                  {dlvReq && dlvCfg && (
                    <div className="admin-rx-delivery-block">
                      <div className="admin-rx-delivery-header">
                        <Truck size={13} />
                        <span>Delivery Request</span>
                        <span className="rx-status-badge" style={{ color: dlvCfg.color, background: dlvCfg.bg, fontSize:'0.68rem', padding:'2px 7px' }}>
                          {dlvCfg.label}
                        </span>
                      </div>
                      <div className="admin-rx-delivery-loc">
                        <MapPin size={11} /> {dlvReq.hostel} · {dlvReq.gate}
                      </div>
                      {dlvReq.note && <div className="admin-rx-delivery-note">{dlvReq.note}</div>}

                      {/* Delivery status controls */}
                      {dlvReq.status !== 'delivered' && (
                        <div className="admin-rx-delivery-actions">
                          {dlvReq.status === 'requested' && (
                            <button className="admin-rx-dlv-btn preparing" onClick={() => handleDeliveryStatus(rx, 'preparing')}>
                              Preparing
                            </button>
                          )}
                          {dlvReq.status === 'preparing' && (
                            <button className="admin-rx-dlv-btn out" onClick={() => handleDeliveryStatus(rx, 'out')}>
                              Out for Delivery
                            </button>
                          )}
                          {dlvReq.status === 'out' && (
                            <button className="admin-rx-dlv-btn delivered" onClick={() => handleDeliveryStatus(rx, 'delivered')}>
                              Mark Delivered
                            </button>
                          )}
                        </div>
                      )}
                    </div>
                  )}

                  {rx.adminNote && rx.status !== 'pending' && (
                    <div className="admin-rx-admin-note">Admin: {rx.adminNote}</div>
                  )}
                </div>

                {/* Footer */}
                <div className="admin-rx-footer">
                  <span className="rx-status-badge" style={{ color: cfg.color, background: cfg.bg }}>
                    <StatusIcon size={12} /> {cfg.label}
                  </span>
                  {rx.status === 'pending' && (
                    <div className="admin-rx-actions">
                      <button className="admin-rx-approve-btn" onClick={() => openReview(rx, 'approved')}>
                        <CheckCircle size={15} /> Approve
                      </button>
                      <button className="admin-rx-reject-btn" onClick={() => openReview(rx, 'rejected')}>
                        <XCircle size={15} /> Reject
                      </button>
                    </div>
                  )}
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
                <span style={{ marginLeft:8, color:'var(--text-secondary)' }}>
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
            {viewing.status === 'pending' && (
              <div className="rx-lightbox-actions">
                <button className="admin-rx-approve-btn lg" onClick={() => { setViewing(null); openReview(viewing, 'approved'); }}>
                  <CheckCircle size={16} /> Approve
                </button>
                <button className="admin-rx-reject-btn lg" onClick={() => { setViewing(null); openReview(viewing, 'rejected'); }}>
                  <XCircle size={16} /> Reject
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Review modal */}
      {reviewModal && (
        <div className="modal-overlay" onClick={() => !submitting && setReviewModal(null)}>
          <div className="modal-box" onClick={(e) => e.stopPropagation()}>
            <div className={`modal-icon-wrap ${reviewModal.action === 'approved' ? 'success' : 'danger'}`}>
              {reviewModal.action === 'approved' ? <CheckCircle size={32} /> : <XCircle size={32} />}
            </div>
            <h3 className="modal-title">
              {reviewModal.action === 'approved' ? 'Approve Prescription?' : 'Reject Prescription?'}
            </h3>
            <p className="modal-sub">
              {reviewModal.rx.prescriptionId} · {reviewModal.rx.user?.name || reviewModal.rx.user?.phone}
            </p>
            <textarea className="modal-note-input" rows={3} maxLength={500}
              placeholder={reviewModal.action === 'rejected' ? 'Reason for rejection (required)...' : 'Add a note for the patient (optional)...'}
              value={adminNote} onChange={(e) => setAdminNote(e.target.value)}
            />
            <div className="modal-actions">
              <button className="modal-cancel-btn" onClick={() => setReviewModal(null)} disabled={submitting}>Cancel</button>
              <button
                className={`modal-confirm-btn ${reviewModal.action === 'approved' ? 'success' : 'danger'}`}
                onClick={handleReview} disabled={submitting}
              >
                {submitting ? 'Saving...' : reviewModal.action === 'approved' ? 'Approve' : 'Reject'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AdminPrescriptions;
