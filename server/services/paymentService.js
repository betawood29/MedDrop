// Payment service — Razorpay order creation and payment verification
// Handles UPI, Google Pay, PhonePe, and card payments

const crypto = require('crypto');
const razorpay = require('../config/razorpay');
const ApiError = require('../utils/apiError');

// Create a Razorpay order for the given amount
const createRazorpayOrder = async (amount, orderId) => {
  if (!razorpay) {
    throw ApiError.badRequest('Payment gateway not configured');
  }

  const options = {
    amount: Math.round(amount * 100), // Razorpay expects amount in paise
    currency: 'INR',
    receipt: orderId,
    notes: {
      orderId,
      app: 'MedDrop',
    },
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

module.exports = { createRazorpayOrder, verifyPayment };
