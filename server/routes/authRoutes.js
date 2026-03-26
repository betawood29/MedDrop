// Auth routes — OTP send/verify, profile completion, get current user
const router = require('express').Router();
const { sendOtp, verifyOtp, completeProfile, getMe } = require('../controllers/authController');
const protect = require('../middleware/auth');
const { otpLimiter } = require('../middleware/rateLimiter');

router.post('/send-otp', otpLimiter, sendOtp);
router.post('/verify-otp', verifyOtp);
router.post('/complete-profile', protect, completeProfile);
router.get('/me', protect, getMe);

module.exports = router;
