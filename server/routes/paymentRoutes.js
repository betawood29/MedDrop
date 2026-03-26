// Payment routes — Razorpay order creation and verification
const router = require('express').Router();
const { createPaymentOrder, verifyPaymentHandler } = require('../controllers/paymentController');
const protect = require('../middleware/auth');

router.post('/create-order', protect, createPaymentOrder);
router.post('/verify', protect, verifyPaymentHandler);

module.exports = router;
