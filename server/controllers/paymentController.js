// Payment controller — Razorpay order creation and payment verification

const Order = require('../models/Order');
const { createRazorpayOrder, verifyPayment } = require('../services/paymentService');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// POST /api/payments/create-order — create a Razorpay order for payment
const createPaymentOrder = async (req, res, next) => {
  try {
    const { amount, orderId } = req.body;
    if (!amount || !orderId) throw ApiError.badRequest('Amount and orderId are required');

    const order = await Order.findOne({ orderId, user: req.user._id });
    if (!order) throw ApiError.notFound('Order not found');

    const razorpayOrder = await createRazorpayOrder(amount, orderId);

    // Save Razorpay order ID to our order
    order.razorpayOrderId = razorpayOrder.id;
    await order.save();

    ApiResponse.success(res, {
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
    }, 'Payment order created');
  } catch (err) {
    next(err);
  }
};

// POST /api/payments/verify — verify Razorpay payment after customer pays
const verifyPaymentHandler = async (req, res, next) => {
  try {
    const { razorpay_order_id, razorpay_payment_id, razorpay_signature } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw ApiError.badRequest('All payment verification fields are required');
    }

    verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    // Update order payment status — verify ownership
    const order = await Order.findOne({ razorpayOrderId: razorpay_order_id, user: req.user._id });
    if (!order) throw ApiError.notFound('Order not found');

    order.paymentStatus = 'paid';
    order.razorpayPaymentId = razorpay_payment_id;
    await order.save();

    ApiResponse.success(res, { orderId: order.orderId, paymentStatus: 'paid' }, 'Payment verified successfully');
  } catch (err) {
    next(err);
  }
};

module.exports = { createPaymentOrder, verifyPaymentHandler };
