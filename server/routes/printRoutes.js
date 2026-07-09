// Print store routes — file upload, order placement, order listing
const router = require('express').Router();
const { createPrintOrder, uploadPrintFiles, getPrintOrders, getPrintOrder, getPricing } = require('../controllers/printController');
const protect = require('../middleware/auth');
const { printUpload } = require('../middleware/upload');

// Public route — get pricing info
router.get('/pricing', getPricing);

// Protected routes
router.use(protect);

// Stages files for a prepaid print order — no order/charge yet. Checkout uploads files
// here first, then pays for shop + print together, then /payments/verify creates the
// actual PrintOrder referencing these already-uploaded files.
router.post('/upload-files', printUpload.array('files', 10), uploadPrintFiles);

// Legacy Cash-on-Delivery print order (kept for backward compatibility) — checkout no
// longer calls this; prepaid print orders go through /payments/initiate + /verify instead.
router.post('/order', printUpload.array('files', 10), createPrintOrder);
router.get('/orders', getPrintOrders);
router.get('/orders/:id', getPrintOrder);

module.exports = router;
