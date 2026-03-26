// Excel upload component — drag & drop with file validation, preview, and reset

import { useState, useRef } from 'react';
import { Upload, FileSpreadsheet, Download, AlertCircle, CheckCircle, X, RotateCcw } from 'lucide-react';
import { parseExcelFile } from '../../services/uploadService';

const ALLOWED_EXTENSIONS = ['xlsx', 'xls'];
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB

const ExcelUpload = ({ onUpload, onDownloadTemplate, loading }) => {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState(null);
  const [error, setError] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const inputRef = useRef(null);

  const resetUpload = () => {
    setFile(null);
    setPreview(null);
    setError('');
    if (inputRef.current) inputRef.current.value = '';
  };

  const validateFile = (selectedFile) => {
    if (!selectedFile) return 'No file selected';

    const ext = selectedFile.name.split('.').pop().toLowerCase();
    if (!ALLOWED_EXTENSIONS.includes(ext)) {
      return `Invalid format ".${ext}" — only .xlsx and .xls files are supported`;
    }

    if (selectedFile.size > MAX_FILE_SIZE) {
      return `File too large (${(selectedFile.size / 1024 / 1024).toFixed(1)}MB). Maximum size is 5MB`;
    }

    return null;
  };

  const handleFile = async (selectedFile) => {
    setError('');
    setPreview(null);
    setFile(null);

    const validationError = validateFile(selectedFile);
    if (validationError) {
      setError(validationError);
      return;
    }

    setFile(selectedFile);

    try {
      const data = await parseExcelFile(selectedFile);
      if (!data || data.length === 0) {
        setError('The file appears to be empty. Please check and try again.');
        setFile(null);
        return;
      }
      setPreview(data);
    } catch {
      setError('Failed to read Excel file. Make sure it is a valid spreadsheet.');
      setFile(null);
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setDragOver(false);
    const droppedFile = e.dataTransfer.files[0];
    handleFile(droppedFile);
  };

  const handleConfirm = () => {
    if (file) onUpload(file);
  };

  return (
    <div className="excel-upload">
      <div className="upload-actions">
        <button className="btn-secondary" onClick={onDownloadTemplate}>
          <Download size={16} /> Download Template
        </button>
      </div>

      {/* Error state with retry */}
      {error && (
        <div className="upload-error-card">
          <div className="upload-error-header">
            <AlertCircle size={20} />
            <span>Upload Error</span>
          </div>
          <p className="upload-error-message">{error}</p>
          <button className="btn-secondary" onClick={resetUpload}>
            <RotateCcw size={14} /> Try Again
          </button>
        </div>
      )}

      {/* Drop zone — shown when no file selected or after reset */}
      {!file && !error && (
        <div
          className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
          onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
          onDragLeave={() => setDragOver(false)}
          onDrop={handleDrop}
          onClick={() => inputRef.current?.click()}
        >
          <Upload size={32} />
          <p>Drop Excel file here or click to browse</p>
          <span className="drop-zone-hint">Supports .xlsx and .xls (max 5MB)</span>
        </div>
      )}

      <input
        ref={inputRef}
        type="file"
        accept=".xlsx,.xls"
        onChange={(e) => handleFile(e.target.files[0])}
        hidden
      />

      {/* File selected with preview */}
      {file && preview && preview.length > 0 && (
        <div className="preview-section">
          <div className="selected-file-card">
            <div className="selected-file-info">
              <FileSpreadsheet size={20} className="file-icon-green" />
              <div>
                <span className="selected-file-name">{file.name}</span>
                <span className="selected-file-meta">{(file.size / 1024).toFixed(0)} KB &middot; {preview.length} rows</span>
              </div>
            </div>
            <button className="icon-btn-sm" onClick={resetUpload} title="Remove file">
              <X size={16} />
            </button>
          </div>

          <h4 className="preview-heading">
            <CheckCircle size={16} className="file-icon-green" /> Preview ({preview.length} rows)
          </h4>
          <div className="preview-table-wrap">
            <table className="preview-table">
              <thead>
                <tr>{Object.keys(preview[0]).map((key) => <th key={key}>{key}</th>)}</tr>
              </thead>
              <tbody>
                {preview.slice(0, 10).map((row, i) => (
                  <tr key={i}>
                    {Object.values(row).map((val, j) => <td key={j}>{String(val ?? '')}</td>)}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {preview.length > 10 && <p className="preview-note">Showing first 10 of {preview.length} rows</p>}

          <div className="upload-confirm-actions">
            <button className="btn-secondary" onClick={resetUpload} disabled={loading}>
              <RotateCcw size={14} /> Change File
            </button>
            <button className="btn-primary" onClick={handleConfirm} disabled={loading}>
              {loading ? 'Uploading...' : `Import ${preview.length} Products`}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExcelUpload;
