// Admin print order table — shows print orders with file previews, download links, per-file config

import { useState } from 'react';
import { Download, Eye } from 'lucide-react';
import { formatPrice, formatDateTime } from '../../utils/formatters';
import { PRINT_ORDER_STATUSES } from '../../utils/constants';

const API_BASE = import.meta.env.VITE_API_URL?.replace('/api', '') || 'http://localhost:5002';
const statusOptions = ['placed', 'printing', 'ready', 'out', 'delivered', 'cancelled'];

const getFileIcon = (name) => {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼️';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['ppt', 'pptx'].includes(ext)) return '📊';
  return '📎';
};

const isImage = (name) => {
  const ext = (name || '').split('.').pop().toLowerCase();
  return ['jpg', 'jpeg', 'png', 'gif', 'webp'].includes(ext);
};

const formatBytes = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const PrintOrderTable = ({ orders, onStatusChange, loading }) => {
  const [expandedId, setExpandedId] = useState(null);

  if (!orders.length) {
    return <div className="empty-state"><p>No print orders found</p></div>;
  }

  return (
    <div className="order-table">
      <div className="table-header">
        <span>Order ID</span>
        <span>Customer</span>
        <span>Files</span>
        <span>Total</span>
        <span>Gate</span>
        <span>Status</span>
        <span>Time</span>
      </div>
      {orders.map((order) => (
        <div key={order._id} className="table-row-wrap">
          <div className="table-row" onClick={() => setExpandedId(expandedId === order._id ? null : order._id)}>
            <span className="order-id-cell">#{order.orderId}</span>
            <span>{order.user?.name || 'N/A'}<br /><small>{order.user?.phone}</small></span>
            <span>{(order.files || []).length} file{(order.files || []).length !== 1 ? 's' : ''} · {order.totalPages}pg</span>
            <span>{formatPrice(order.total)}</span>
            <span>{order.gate}</span>
            <span>
              <select
                value={order.status}
                onChange={(e) => { e.stopPropagation(); onStatusChange(order._id, e.target.value); }}
                className="status-select"
                style={{ color: PRINT_ORDER_STATUSES[order.status]?.color }}
                disabled={loading}
              >
                {statusOptions.map((s) => (
                  <option key={s} value={s}>{PRINT_ORDER_STATUSES[s].label}</option>
                ))}
              </select>
            </span>
            <span>{formatDateTime(order.createdAt)}</span>
          </div>

          {expandedId === order._id && (
            <div className="table-row-detail">
              {/* Per-file details with preview and download */}
              <div className="po-files-grid">
                {(order.files || []).map((file, i) => {
                  const fileUrl = file.url.startsWith('http') ? file.url : `${API_BASE}${file.url}`;
                  return (
                    <div key={i} className="po-file-card">
                      {/* Preview */}
                      <div className="po-file-preview">
                        {isImage(file.originalName) ? (
                          <img src={fileUrl} alt={file.originalName} />
                        ) : (
                          <span className="po-file-icon">{getFileIcon(file.originalName)}</span>
                        )}
                      </div>

                      {/* File info */}
                      <div className="po-file-info">
                        <strong className="po-file-name">{file.originalName}</strong>
                        <div className="po-file-meta">
                          <span>{file.pages || 1} pg × {file.copies || 1} copies</span>
                          <span>{file.colorMode === 'color' ? 'Color' : 'B&W'} · {file.sides === 'double' ? 'Double' : 'Single'} · {file.orientation === 'landscape' ? 'Landscape' : 'Portrait'}</span>
                          {file.size > 0 && <span>{formatBytes(file.size)}</span>}
                        </div>

                        {/* Action buttons */}
                        <div className="po-file-actions">
                          <a href={fileUrl} target="_blank" rel="noopener noreferrer" className="po-file-btn" title="View file">
                            <Eye size={14} /> View
                          </a>
                          <a href={fileUrl} download={file.originalName} className="po-file-btn" title="Download file">
                            <Download size={14} /> Download
                          </a>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Order meta */}
              <div className="detail-meta" style={{ marginTop: 12 }}>
                <span>Hostel: {order.hostel}</span>
                <span>Payment: {(order.paymentMethod || 'cod').toUpperCase()}</span>
                <span>Subtotal: {formatPrice(order.subtotal)} + Delivery: {order.deliveryFee === 0 ? 'FREE' : formatPrice(order.deliveryFee)}</span>
                {order.note && <span>Note: <strong>{order.note}</strong></span>}
              </div>
            </div>
          )}
        </div>
      ))}
    </div>
  );
};

export default PrintOrderTable;
