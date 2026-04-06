// Payment controller — Razorpay payment initiation and verification
// Flow: initiate payment → user pays → verify & create order

const Order = require('../models/Order');
const Product = require('../models/Product');
const { createRazorpayOrder, verifyPayment } = require('../services/paymentService');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

const DELIVERY_FEE = 25;
const FREE_DELIVERY_MIN = 199;

// POST /api/payments/initiate — calculate total from cart items and create Razorpay order
// No real order is created yet — just a payment intent
const initiatePayment = async (req, res, next) => {
  try {
    const { items, hostel, gate, note } = req.body;
    if (!items || !items.length) throw ApiError.badRequest('Items are required');
    if (!hostel || !gate) throw ApiError.badRequest('Hostel and gate are required');

    // Validate products and calculate total
    let subtotal = 0;
    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) throw ApiError.badRequest(`Product not found: ${item.product}`);
      if (!product.isActive || !product.inStock) {
        throw ApiError.badRequest(`${product.name} is currently unavailable`);
      }
      if (product.stockQty > 0 && product.stockQty < item.quantity) {
        throw ApiError.badRequest(`Only ${product.stockQty} units of ${product.name} available`);
      }
      subtotal += product.price * item.quantity;
    }

    const deliveryFee = subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
    const total = subtotal + deliveryFee;

    // Create Razorpay order with a temporary receipt (max 40 chars)
    const receipt = `pre_${Date.now()}`;
    const razorpayOrder = await createRazorpayOrder(total, receipt);

    ApiResponse.success(res, {
      razorpayOrderId: razorpayOrder.id,
      amount: razorpayOrder.amount,
      currency: razorpayOrder.currency,
      keyId: process.env.RAZORPAY_KEY_ID,
      subtotal,
      deliveryFee,
      total,
    }, 'Payment initiated');
  } catch (err) {
    next(err);
  }
};

// POST /api/payments/verify — verify payment and create the actual order
const verifyAndCreateOrder = async (req, res, next) => {
  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      items, hostel, gate, note,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw ApiError.badRequest('All payment verification fields are required');
    }
    if (!items || !items.length) throw ApiError.badRequest('Items are required');

    // Step 1: Verify payment signature
    verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    // Step 2: Build order items and deduct stock (same logic as createOrder)
    const orderItems = [];
    let subtotal = 0;
    const productsToUpdate = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) throw ApiError.badRequest(`Product not found: ${item.product}`);
      if (!product.isActive || !product.inStock) {
        throw ApiError.badRequest(`${product.name} is currently unavailable`);
      }
      if (product.stockQty > 0 && product.stockQty < item.quantity) {
        throw ApiError.badRequest(`Only ${product.stockQty} units of ${product.name} available`);
      }

      subtotal += product.price * item.quantity;
      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.image,
      });
      productsToUpdate.push({ product, quantity: item.quantity });
    }

    // Deduct stock
    for (const { product, quantity } of productsToUpdate) {
      if (product.stockQty > 0) {
        product.stockQty -= quantity;
        if (product.stockQty <= 0) {
          product.stockQty = 0;
          product.inStock = false;
        }
        await product.save();

        try {
          const { getIO } = require('../config/socket');
          const io = getIO();
          const payload = {
            _id: product._id,
            name: product.name,
            inStock: product.inStock,
            stockQty: product.stockQty,
          };
          io.to('shop').emit('product-update', payload);
          io.to('admin').emit('product-update', payload);
        } catch (socketErr) {
          // Socket not initialized
        }
      }
    }

    // Step 3: Create the order (payment already verified)
    const deliveryFee = subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
    const total = subtotal + deliveryFee;

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      subtotal,
      deliveryFee,
      total,
      hostel,
      gate,
      note,
      paymentMethod: 'upi',
      paymentStatus: 'paid',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    // Emit to admin
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      io.to('admin').emit('new-order', {
        orderId: order.orderId,
        total: order.total,
        items: order.items.length,
        gate: order.gate,
      });
    } catch (socketErr) {
      // Socket not initialized
    }

    ApiResponse.created(res, {
      orderId: order.orderId,
      total: order.total,
      status: order.status,
      paymentStatus: order.paymentStatus,
    }, 'Payment verified & order placed!');
  } catch (err) {
    next(err);
  }
};

module.exports = { initiatePayment, verifyAndCreateOrder };
