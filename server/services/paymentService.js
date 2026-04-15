// Payment service — Razorpay order creation and payment verification
// Handles UPI, Google Pay, PhonePe, and card payments

const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const ApiError = require('../utils/apiError');

// Create a Razorpay order for the given amount.
// authorizeOnly=true → payment_capture:0 (hold funds, capture later) — used for Rx orders
const createRazorpayOrder = async (amount, orderId, authorizeOnly = false) => {
  if (!razorpay) {
    throw ApiError.badRequest('Payment gateway not configured');
  }

  const options = {
    amount: Math.round(amount * 100), // Razorpay expects amount in paise
    currency: 'INR',
    receipt: orderId,
    payment_capture: authorizeOnly ? 0 : 1,
    notes: { orderId, app: 'MedDrop' },
  };

  const order = await razorpay.orders.create(options);
  return order;
};

// Verify Razorpay payment signature to confirm payment is genuine
const verifyPayment = (razorpayOrderId, razorpayPaymentId, razorpaySignature) => {
  const generatedSignature = crypto
    .createHmac('sha256', process.env.RAZORPAY_KEY_SECRET)
    .update(`${razorpayOrderId}|${razorpayPaymentId}`)
    .digest('hex');

  if (generatedSignature !== razorpaySignature) {
    throw ApiError.badRequest('Payment verification failed — invalid signature');
  }

  return true;
};

// Capture an authorized Razorpay payment (used for Rx orders after prescription confirmed)
const capturePayment = async (paymentId, amount) => {
  if (!razorpay) throw ApiError.badRequest('Payment gateway not configured');
  return razorpay.payments.capture(paymentId, Math.round(amount * 100), 'INR');
};

module.exports = { createRazorpayOrder, verifyPayment, capturePayment };
