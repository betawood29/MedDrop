// Multer config for file uploads
// Used for Excel product uploads and product image uploads

const multer = require('multer');
const path = require('path');
const ApiError = require('../utils/apiError');

// Excel file uploads — stored temporarily in /uploads
const excelStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads'));
  },
  filename: (req, file, cb) => {
    const uniqueName = `products_${Date.now()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const excelUpload = multer({
  storage: excelStorage,
  fileFilter: (req, file, cb) => {
    const allowedTypes = [
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      'application/vnd.ms-excel',
      'application/octet-stream', // Some clients send this for .xlsx
    ];
    const allowedExts = ['.xlsx', '.xls'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedTypes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new ApiError('Only .xlsx and .xls files are allowed', 400), false);
    }
  },
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

// Image uploads — stored in memory buffer for direct Cloudinary upload
const imageUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new ApiError('Only image files are allowed', 400), false);
    }
  },
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
});

// Print file uploads — PDFs, images, docs for print store
const printUpload = multer({
  storage: multer.diskStorage({
    destination: (req, file, cb) => {
      cb(null, path.join(__dirname, '../../uploads'));
    },
    filename: (req, file, cb) => {
      const uniqueName = `print_${Date.now()}_${Math.random().toString(36).slice(2, 8)}${path.extname(file.originalname)}`;
      cb(null, uniqueName);
    },
  }),
  fileFilter: (req, file, cb) => {
    const allowedExts = ['.pdf', '.doc', '.docx', '.jpg', '.jpeg', '.png', '.ppt', '.pptx'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new ApiError('Only PDF, DOC, DOCX, JPG, PNG, PPT, PPTX files are allowed', 400), false);
    }
  },
  limits: { fileSize: 20 * 1024 * 1024 }, // 20MB max per file
});

// Prescription uploads — images (JPG/PNG) and PDFs, stored in memory for Cloudinary
const prescriptionUpload = multer({
  storage: multer.memoryStorage(),
  fileFilter: (req, file, cb) => {
    const allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const allowedExts = ['.jpg', '.jpeg', '.png', '.pdf'];
    const ext = path.extname(file.originalname).toLowerCase();
    if (allowedMimes.includes(file.mimetype) || allowedExts.includes(ext)) {
      cb(null, true);
    } else {
      cb(new ApiError('Only JPG, PNG, or PDF files are allowed for prescriptions', 400), false);
    }
  },
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB max
});

module.exports = { excelUpload, imageUpload, printUpload, prescriptionUpload };
