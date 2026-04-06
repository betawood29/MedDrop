// Payment routes — initiate payment and verify + create order
const router = require('express').Router();
const { initiatePayment, verifyAndCreateOrder } = require('../controllers/paymentController');
const protect = require('../middleware/auth');

router.post('/initiate', protect, initiatePayment);
router.post('/verify', protect, verifyAndCreateOrder);

module.exports = router;
