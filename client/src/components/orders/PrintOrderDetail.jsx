// Print order detail component — shows print config, files, tracker, delivery, and payment

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

      {/* Print Configuration */}
      <div className="order-detail-section">
        <h3>Print Settings</h3>
        <div className="print-config-grid">
          <div className="print-config-chip">
            <span>Pages</span>
            <span>{order.totalPages}</span>
          </div>
          <div className="print-config-chip">
            <span>Copies</span>
            <span>{order.config?.copies || 1}</span>
          </div>
          <div className="print-config-chip">
            <span>Mode</span>
            <span>{order.config?.colorMode === 'color' ? 'Color' : 'Black & White'}</span>
          </div>
          <div className="print-config-chip">
            <span>Sides</span>
            <span>{order.config?.sides === 'double' ? 'Double-sided' : 'Single-sided'}</span>
          </div>
          <div className="print-config-chip">
            <span>Paper</span>
            <span>{order.config?.paperSize || 'A4'}</span>
          </div>
          <div className="print-config-chip">
            <span>Per Page</span>
            <span>{formatPrice(order.pricePerPage)}</span>
          </div>
        </div>
      </div>

      {/* Files */}
      <div className="order-detail-section">
        <h3>Files ({(order.files || []).length})</h3>
        <div className="print-detail-files">
          {(order.files || []).map((file, i) => (
            <div key={i} className="print-detail-file">
              <span className="print-detail-file-icon">{getFileIcon(file.originalName)}</span>
              <span className="print-detail-file-name">{file.originalName}</span>
              <span className="print-detail-file-size">{formatBytes(file.size)}</span>
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
