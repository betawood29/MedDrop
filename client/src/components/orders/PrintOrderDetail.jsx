// Print order detail component — per-file details, tracker, delivery, and payment

import PrintOrderTracker from './PrintOrderTracker';
import { formatPrice, formatDateTime } from '../../utils/formatters';

const getFileIcon = (name) => {
  const ext = (name || '').split('.').pop().toLowerCase();
  if (ext === 'pdf') return '📄';
  if (['jpg', 'jpeg', 'png'].includes(ext)) return '🖼️';
  if (['doc', 'docx'].includes(ext)) return '📝';
  if (['ppt', 'pptx'].includes(ext)) return '📊';
  return '📎';
};

const formatBytes = (bytes) => {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const PrintOrderDetail = ({ order }) => {
  return (
    <div className="order-detail print-order-detail">
      <div className="order-detail-header">
        <h2>Order #{order.orderId}</h2>
        <span className="order-date">{formatDateTime(order.createdAt)}</span>
      </div>

      <PrintOrderTracker status={order.status} />

      {/* Summary chips */}
      <div className="order-detail-section">
        <h3>Order Summary</h3>
        <div className="print-config-grid">
          <div className="print-config-chip">
            <span>Total Pages</span>
            <span>{order.totalPages}</span>
          </div>
          <div className="print-config-chip">
            <span>Files</span>
            <span>{(order.files || []).length}</span>
          </div>
          <div className="print-config-chip">
            <span>Subtotal</span>
            <span>{formatPrice(order.subtotal)}</span>
          </div>
          <div className="print-config-chip">
            <span>Delivery</span>
            <span>{order.deliveryFee === 0 ? 'FREE' : formatPrice(order.deliveryFee)}</span>
          </div>
        </div>
      </div>

      {/* Per-file details */}
      <div className="order-detail-section">
        <h3>Files ({(order.files || []).length})</h3>
        <div className="pod-file-list">
          {(order.files || []).map((file, i) => (
            <div key={i} className="pod-file-card">
              <div className="pod-file-left">
                <span className="pod-file-icon">{getFileIcon(file.originalName)}</span>
                <div className="pod-file-info">
                  <strong className="pod-file-name">File {i + 1} — {file.originalName}</strong>
                  {file.size > 0 && <span className="pod-file-size">{formatBytes(file.size)}</span>}
                </div>
              </div>
              <div className="pod-file-config">
                <div className="pod-tag">{file.pages || 1} pg × {file.copies || 1} copies</div>
                <div className="pod-tag">{file.colorMode === 'color' ? 'Color' : 'B&W'}</div>
                <div className="pod-tag">{file.sides === 'double' ? 'Double-sided' : 'Single'}</div>
                <div className="pod-tag">{file.orientation === 'landscape' ? 'Landscape' : 'Portrait'}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Payment */}
      <div className="order-detail-section">
        <h3>Payment</h3>
        <div className="detail-row">
          <span>Subtotal</span><span>{formatPrice(order.subtotal)}</span>
        </div>
        <div className="detail-row">
          <span>Delivery</span>
          <span>{order.deliveryFee === 0 ? 'FREE' : formatPrice(order.deliveryFee)}</span>
        </div>
        <div className="detail-row total">
          <span>Total</span><span>{formatPrice(order.total)}</span>
        </div>
        <div className="detail-row">
          <span>Method</span><span>{(order.paymentMethod || 'cod').toUpperCase()}</span>
        </div>
      </div>

      {/* Delivery */}
      <div className="order-detail-section">
        <h3>Delivery</h3>
        <div className="detail-row"><span>Hostel</span><span>{order.hostel}</span></div>
        <div className="detail-row"><span>Gate</span><span>{order.gate}</span></div>
        {order.note && <div className="detail-row"><span>Note</span><span>{order.note}</span></div>}
      </div>
    </div>
  );
};

export default PrintOrderDetail;
