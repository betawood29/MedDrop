// Rate limiting middleware
// Prevents OTP spam and API abuse

const rateLimit = require('express-rate-limit');

// OTP endpoint: max 5 requests per 10 minutes per IP
const otpLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  max: 5,
  message: {
    success: false,
    message: 'Too many OTP requests. Please try again after 10 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// General API: max 100 requests per minute per IP
const apiLimiter = rateLimit({
  windowMs: 60 * 1000,
  max: 100,
  message: {
    success: false,
    message: 'Too many requests. Please slow down.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

// Admin login: max 5 attempts per 15 minutes per IP
const adminLoginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 5,
  skipSuccessfulRequests: true,
  message: {
    success: false,
    message: 'Too many login attempts. Please try again after 15 minutes.',
  },
  standardHeaders: true,
  legacyHeaders: false,
});

module.exports = { otpLimiter, apiLimiter, adminLoginLimiter };
