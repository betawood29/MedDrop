// Print store routes — file upload, order placement, order listing
const router = require('express').Router();
const { createPrintOrder, getPrintOrders, getPrintOrder, getPricing } = require('../controllers/printController');
const protect = require('../middleware/auth');
const { printUpload } = require('../middleware/upload');

// Public route — get pricing info
router.get('/pricing', getPricing);

// Protected routes
router.use(protect);

router.post('/order', printUpload.array('files', 10), createPrintOrder);
router.get('/orders', getPrintOrders);
router.get('/orders/:id', getPrintOrder);

module.exports = router;
