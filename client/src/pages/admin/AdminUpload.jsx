// Admin Excel upload page — upload products via Excel file with preview and results

import { useState } from 'react';
import toast from 'react-hot-toast';
import { Upload, CheckCircle, AlertTriangle, XCircle, RotateCcw } from 'lucide-react';
import ExcelUploadComponent from '../../components/admin/ExcelUpload';
import { uploadExcel, downloadTemplate } from '../../services/adminService';

const AdminUpload = () => {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState(null);

  const handleUpload = async (file) => {
    setLoading(true);
    setResult(null);
    try {
      const formData = new FormData();
      formData.append('file', file);
      const res = await uploadExcel(formData);
      const data = res.data.data;
      const isSuccess = (data.added > 0 || data.updated > 0);
      setResult({ ...data, success: isSuccess });
      if (isSuccess) {
        toast.success(res.data.message);
      } else {
        toast.error('Import failed — no products were imported. Check errors below.');
      }
    } catch (err) {
      toast.error(err.response?.data?.message || 'Upload failed');
    } finally {
      setLoading(false);
    }
  };

  const handleDownloadTemplate = async () => {
    try {
      const res = await downloadTemplate();
      const url = window.URL.createObjectURL(new Blob([res.data]));
      const a = document.createElement('a');
      a.href = url;
      a.download = 'meddrop-product-template.xlsx';
      a.click();
      window.URL.revokeObjectURL(url);
    } catch {
      toast.error('Failed to download template');
    }
  };

  const handleReset = () => {
    setResult(null);
  };

  return (
    <div className="admin-page">
      <h2><Upload size={22} /> Excel Product Upload</h2>
      <p className="text-muted" style={{ marginBottom: 20 }}>
        Upload a .xlsx file to bulk add or update products. Download the template first to see the expected format.
      </p>

      {!result ? (
        <ExcelUploadComponent
          onUpload={handleUpload}
          onDownloadTemplate={handleDownloadTemplate}
          loading={loading}
        />
      ) : (
        <div className="upload-result-card">
          {/* Result header — green for success, red for failure */}
          <div className={`upload-result-header ${result.success ? '' : 'upload-result-error'}`}>
            {result.success ? (
              <CheckCircle size={24} className="file-icon-green" />
            ) : (
              <XCircle size={24} className="file-icon-red" />
            )}
            <div>
              <h3>{result.success ? 'Import Complete' : 'Import Unsuccessful'}</h3>
              <p className="text-muted">
                {result.success
                  ? 'Your file has been processed'
                  : 'No products were imported. Please fix the errors and try again.'}
              </p>
            </div>
          </div>

          {/* Stats */}
          <div className="upload-result-stats">
            {result.added > 0 && (
              <div className="upload-stat success">
                <CheckCircle size={18} />
                <div>
                  <span className="upload-stat-value">{result.added}</span>
                  <span className="upload-stat-label">Added</span>
                </div>
              </div>
            )}
            {result.updated > 0 && (
              <div className="upload-stat info">
                <RotateCcw size={18} />
                <div>
                  <span className="upload-stat-value">{result.updated}</span>
                  <span className="upload-stat-label">Updated</span>
                </div>
              </div>
            )}
            {(result.errors?.length > 0) && (
              <div className="upload-stat error">
                <XCircle size={18} />
                <div>
                  <span className="upload-stat-value">{result.errors.length}</span>
                  <span className="upload-stat-label">Errors</span>
                </div>
              </div>
            )}
          </div>

          {/* Errors detail */}
          {result.errors?.length > 0 && (
            <div className="upload-errors-section">
              <h4><AlertTriangle size={16} /> Errors ({result.errors.length})</h4>
              <div className="upload-errors-list">
                {result.errors.slice(0, 20).map((e, i) => (
                  <div key={i} className="upload-error-row">
                    <span className="upload-error-row-num">Row {e.row}</span>
                    <span className="upload-error-row-msg">{e.reason}</span>
                  </div>
                ))}
                {result.errors.length > 20 && (
                  <p className="text-muted" style={{ padding: '8px 0', fontSize: '0.85rem' }}>
                    ...and {result.errors.length - 20} more errors
                  </p>
                )}
              </div>
            </div>
          )}

          {/* Upload again button */}
          <button className="btn-primary" onClick={handleReset} style={{ marginTop: 20 }}>
            <RotateCcw size={16} style={{ marginRight: 8 }} />
            Upload Another File
          </button>
        </div>
      )}
    </div>
  );
};

export default AdminUpload;
