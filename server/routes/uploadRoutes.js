// Upload routes — standalone upload endpoints (also available under /api/admin)
// This file is kept for modularity; primary upload is via admin routes
const router = require('express').Router();
const adminAuth = require('../middleware/admin');
const { excelUpload } = require('../middleware/upload');
const { uploadExcel, downloadTemplate } = require('../controllers/uploadController');

router.post('/excel', adminAuth, excelUpload.single('file'), uploadExcel);
router.get('/template', adminAuth, downloadTemplate);

module.exports = router;
