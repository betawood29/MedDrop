import { AlertTriangle, Trash2 } from 'lucide-react';

const ConfirmModal = ({
  isOpen,
  title,
  message,
  onConfirm,
  onCancel,
  confirmText = 'Delete',
  cancelText = 'Cancel',
  variant = 'danger',
}) => {
  if (!isOpen) return null;

  return (
    <div className="modal-overlay" onClick={onCancel}>
      <div className="modal-box" onClick={(e) => e.stopPropagation()}>
        <div className={`modal-icon-wrap ${variant}`}>
          <Trash2 size={24} />
        </div>
        <p className="modal-title">{title}</p>
        {message && <p className="modal-sub">{message}</p>}
        <div className="modal-actions">
          <button className="modal-cancel-btn" onClick={onCancel}>{cancelText}</button>
          <button className={`modal-confirm-btn ${variant}`} onClick={onConfirm}>{confirmText}</button>
        </div>
      </div>
    </div>
  );
};

export default ConfirmModal;
