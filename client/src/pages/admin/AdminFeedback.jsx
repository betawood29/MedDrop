// Admin feedback page — view suggestions, complaints, and delivery reviews

import { useState, useEffect, useCallback } from 'react';
import toast from 'react-hot-toast';
import Loader from '../../components/common/Loader';
import { getFeedbackList, updateFeedbackStatus } from '../../services/feedbackService';
import { formatDate } from '../../utils/formatters';
import { MessageSquare, Star, Bug, Lightbulb, AlertCircle, CheckCircle, Clock, Filter } from 'lucide-react';

const TYPE_CONFIG = {
  suggestion:      { label: 'Suggestion',      icon: <Lightbulb size={14} />,    color: '#7c3aed' },
  complaint:       { label: 'Complaint',        icon: <AlertCircle size={14} />,  color: '#ef4444' },
  bug:             { label: 'Bug',              icon: <Bug size={14} />,          color: '#f97316' },
  general:         { label: 'General',          icon: <MessageSquare size={14} />, color: '#6b7280' },
  delivery_review: { label: 'Delivery Review',  icon: <Star size={14} />,         color: '#eab308' },
};

const STATUS_CONFIG = {
  new:      { label: 'New',      icon: <Clock size={13} />,        color: '#3b82f6' },
  read:     { label: 'Read',     icon: <MessageSquare size={13} />, color: '#6b7280' },
  resolved: { label: 'Resolved', icon: <CheckCircle size={13} />,  color: '#22c55e' },
};

const StarRow = ({ rating }) => (
  <span style={{ color: '#eab308', letterSpacing: 1 }}>
    {Array.from({ length: 5 }, (_, i) => (i < rating ? '★' : '☆')).join('')}
  </span>
);

const AdminFeedback = () => {
  const [items, setItems]         = useState([]);
  const [total, setTotal]         = useState(0);
  const [loading, setLoading]     = useState(true);
  const [typeFilter, setTypeFilter]     = useState('');
  const [statusFilter, setStatusFilter] = useState('new');
  const [page, setPage]           = useState(1);
  const [updatingId, setUpdatingId] = useState(null);

  const fetchFeedback = useCallback(async () => {
    setLoading(true);
    try {
      const params = { page, limit: 30 };
      if (typeFilter)   params.type   = typeFilter;
      if (statusFilter) params.status = statusFilter;
      const res = await getFeedbackList(params);
      setItems(res.data.data.items);
      setTotal(res.data.data.total);
    } catch {
      toast.error('Failed to load feedback');
    } finally {
      setLoading(false);
    }
  }, [typeFilter, statusFilter, page]);

  useEffect(() => { fetchFeedback(); }, [fetchFeedback]);

  const handleStatusChange = async (id, status) => {
    setUpdatingId(id);
    try {
      await updateFeedbackStatus(id, status);
      setItems((prev) => prev.map((it) => it._id === id ? { ...it, status } : it));
      toast.success('Status updated');
    } catch {
      toast.error('Failed to update status');
    } finally {
      setUpdatingId(null);
    }
  };

  const totalPages = Math.ceil(total / 30);

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h2 className="admin-page-title">Feedback &amp; Reviews</h2>
        <span style={{ fontSize: '0.85rem', color: '#6b7280' }}>{total} total</span>
      </div>

      {/* Filters */}
      <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <Filter size={14} style={{ color: '#6b7280' }} />
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); setPage(1); }}
            style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', color: '#374151', cursor: 'pointer', outline: 'none' }}
          >
            <option value="">All Statuses</option>
            <option value="new">New</option>
            <option value="read">Read</option>
            <option value="resolved">Resolved</option>
          </select>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 6, background: '#f8fafc', padding: '6px 10px', borderRadius: 8, border: '1px solid #e2e8f0' }}>
          <MessageSquare size={14} style={{ color: '#6b7280' }} />
          <select
            value={typeFilter}
            onChange={(e) => { setTypeFilter(e.target.value); setPage(1); }}
            style={{ border: 'none', background: 'transparent', fontSize: '0.85rem', color: '#374151', cursor: 'pointer', outline: 'none' }}
          >
            <option value="">All Types</option>
            {Object.entries(TYPE_CONFIG).map(([key, cfg]) => (
              <option key={key} value={key}>{cfg.label}</option>
            ))}
          </select>
        </div>
      </div>

      {loading ? (
        <Loader />
      ) : items.length === 0 ? (
        <div className="empty-state">
          <span className="empty-icon">💬</span>
          <h3>No feedback yet</h3>
          <p>Feedback from users will appear here</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          {items.map((item) => {
            const typeCfg   = TYPE_CONFIG[item.type]   || TYPE_CONFIG.general;
            const statusCfg = STATUS_CONFIG[item.status] || STATUS_CONFIG.new;

            return (
              <div
                key={item._id}
                style={{
                  background: '#fff',
                  border: '1px solid #e2e8f0',
                  borderRadius: 12,
                  padding: '14px 16px',
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 8,
                  borderLeft: `4px solid ${typeCfg.color}`,
                }}
              >
                {/* Header row */}
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 8 }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{
                      display: 'inline-flex', alignItems: 'center', gap: 4,
                      background: `${typeCfg.color}18`, color: typeCfg.color,
                      padding: '3px 8px', borderRadius: 6, fontSize: '0.75rem', fontWeight: 600,
                    }}>
                      {typeCfg.icon} {typeCfg.label}
                    </span>
                    {item.type === 'delivery_review' && item.rating && (
                      <StarRow rating={item.rating} />
                    )}
                    {item.orderId && (
                      <span style={{ fontSize: '0.75rem', color: '#6b7280' }}>Order #{item.orderId}</span>
                    )}
                  </div>

                  <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>
                      {formatDate(item.createdAt)}
                    </span>
                    <select
                      value={item.status}
                      disabled={updatingId === item._id}
                      onChange={(e) => handleStatusChange(item._id, e.target.value)}
                      style={{
                        fontSize: '0.75rem', fontWeight: 600,
                        color: statusCfg.color,
                        background: `${statusCfg.color}18`,
                        border: `1px solid ${statusCfg.color}40`,
                        borderRadius: 6, padding: '3px 8px', cursor: 'pointer', outline: 'none',
                      }}
                    >
                      <option value="new">New</option>
                      <option value="read">Read</option>
                      <option value="resolved">Resolved</option>
                    </select>
                  </div>
                </div>

                {/* User info */}
                {(item.name || item.phone) && (
                  <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                    {item.name && <span style={{ fontWeight: 600 }}>{item.name}</span>}
                    {item.name && item.phone && ' · '}
                    {item.phone && <span>{item.phone}</span>}
                  </div>
                )}

                {/* Message */}
                {item.message && (
                  <p style={{ fontSize: '0.88rem', color: '#374151', margin: 0, lineHeight: 1.5 }}>
                    {item.message}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'center', gap: 8, marginTop: 20 }}>
          <button
            disabled={page === 1}
            onClick={() => setPage((p) => p - 1)}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: page === 1 ? 'not-allowed' : 'pointer', opacity: page === 1 ? 0.5 : 1 }}
          >
            Prev
          </button>
          <span style={{ padding: '6px 12px', fontSize: '0.85rem', color: '#6b7280' }}>
            {page} / {totalPages}
          </span>
          <button
            disabled={page === totalPages}
            onClick={() => setPage((p) => p + 1)}
            style={{ padding: '6px 14px', borderRadius: 8, border: '1px solid #e2e8f0', background: '#fff', cursor: page === totalPages ? 'not-allowed' : 'pointer', opacity: page === totalPages ? 0.5 : 1 }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminFeedback;
