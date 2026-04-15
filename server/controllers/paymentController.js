// Payment controller — Razorpay payment initiation and verification
//
// Rx-order flow (authorize/capture):
//   1. initiatePayment  → detects Rx items → creates Razorpay order with payment_capture:0
//   2. verifyAndCreateOrder → verifies signature → creates Order (paymentStatus:'authorized', requiresCapture:true)
//   3. Admin confirms order → adminController.updateOrderStatus captures payment → paymentStatus:'paid'
//
// Non-Rx flow (immediate capture):
//   1. initiatePayment  → payment_capture:1
//   2. verifyAndCreateOrder → paymentStatus:'paid' immediately

const Order        = require('../models/Order');
const Product      = require('../models/Product');
const Prescription = require('../models/Prescription');
const { createRazorpayOrder, verifyPayment } = require('../services/paymentService');
const ApiResponse  = require('../utils/apiResponse');
const ApiError     = require('../utils/apiError');

const DELIVERY_FEE     = 25;
const FREE_DELIVERY_MIN = 199;

// ─── helpers ────────────────────────────────────────────────────────────────

// Find the most recent valid prescription for the given user
const findValidPrescription = async (userId) => {
  const now = new Date();
  return Prescription.findOne({
    user: userId,
    status: { $in: ['approved', 'partially_approved'] },
    $or: [
      // Reusable: not expired and usage not exhausted
      { isReusable: true,  expiresAt: { $gt: now }, $expr: { $lt: ['$usageCount', '$maxUsage'] } },
      // Single-use: not yet linked to any order and no legacy delivery request
      { isReusable: false, order: { $exists: false }, 'deliveryRequest.hostel': { $exists: false } },
    ],
  }).sort({ createdAt: -1 });
};

// Describe why the user has no valid prescription (for friendly error messages)
const getPrescriptionBlockReason = async (userId) => {
  const latest = await Prescription.findOne({ user: userId }).sort({ createdAt: -1 }).lean();
  if (!latest) return 'No prescription uploaded. Please upload one on the Prescription page.';
  if (latest.status === 'pending') return 'Your prescription is still under review. Please wait for approval before checking out.';
  if (latest.status === 'clarification_required') return 'Our pharmacist needs clarification on your prescription. Please check the Prescription page and respond.';
  if (latest.status === 'rejected') return `Your prescription was rejected. Reason: ${latest.adminNote || 'Please upload a new one.'}`;
  if (latest.expiresAt && latest.expiresAt < new Date()) return 'Your prescription has expired (90-day validity). Please upload a fresh prescription.';
  return 'A valid, approved prescription is required to order prescription medicines.';
};

// ─── POST /api/payments/initiate ────────────────────────────────────────────

const initiatePayment = async (req, res, next) => {
  try {
    const { items, hostel, gate, note } = req.body;
    if (!items?.length) throw ApiError.badRequest('Items are required');
    if (!hostel || !gate) throw ApiError.badRequest('Hostel and gate are required');

    let subtotal = 0;
    let hasRxItems = false;

    for (const item of items) {
      const product = await Product.findById(item.product).select('name price isActive inStock stockQty requiresPrescription');
      if (!product) throw ApiError.badRequest(`Product not found: ${item.product}`);
      if (!product.isActive || !product.inStock) throw ApiError.badRequest(`${product.name} is currently unavailable`);
      if (product.stockQty > 0 && product.stockQty < item.quantity) {
        throw ApiError.badRequest(`Only ${product.stockQty} unit(s) of ${product.name} available`);
      }
      subtotal += product.price * item.quantity;
      if (product.requiresPrescription) hasRxItems = true;
    }

    // Block checkout if prescription status is not valid for Rx items
    if (hasRxItems) {
      const validRx = await findValidPrescription(req.user._id);
      if (!validRx) {
        const reason = await getPrescriptionBlockReason(req.user._id);
        throw ApiError.badRequest(reason);
      }
    }

    const deliveryFee   = subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
    const total         = subtotal + deliveryFee;
    const receipt       = `pre_${Date.now()}`;
    // Rx orders: authorize only (payment_capture:0); non-Rx: immediate capture
    const razorpayOrder = await createRazorpayOrder(total, receipt, hasRxItems);

    ApiResponse.success(res, {
      razorpayOrderId: razorpayOrder.id,
      amount:          razorpayOrder.amount,
      currency:        razorpayOrder.currency,
      keyId:           process.env.RAZORPAY_KEY_ID,
      subtotal,
      deliveryFee,
      total,
      authorizeOnly:   hasRxItems,  // inform frontend of capture mode
    }, 'Payment initiated');
  } catch (err) {
    next(err);
  }
};

// ─── POST /api/payments/verify ───────────────────────────────────────────────

const verifyAndCreateOrder = async (req, res, next) => {
  try {
    const {
      razorpay_order_id, razorpay_payment_id, razorpay_signature,
      items, hostel, gate, note,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw ApiError.badRequest('All payment verification fields are required');
    }
    if (!items?.length) throw ApiError.badRequest('Items are required');

    // 1. Verify signature
    verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    // 2. Build order items + deduct stock
    const orderItems = [];
    let subtotal = 0;
    const productsToUpdate = [];
    let hasRxItems = false;

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product || !product.isActive || !product.inStock) {
        throw ApiError.badRequest(`${product?.name || item.product} is unavailable`);
      }
      if (product.stockQty > 0 && product.stockQty < item.quantity) {
        throw ApiError.badRequest(`Only ${product.stockQty} unit(s) of ${product.name} available`);
      }
      subtotal += product.price * item.quantity;
      if (product.requiresPrescription) hasRxItems = true;
      orderItems.push({ product: product._id, name: product.name, price: product.price, quantity: item.quantity, image: product.image });
      productsToUpdate.push({ product, quantity: item.quantity });
    }

    // Deduct stock
    for (const { product, quantity } of productsToUpdate) {
      if (product.stockQty > 0) {
        product.stockQty -= quantity;
        if (product.stockQty <= 0) { product.stockQty = 0; product.inStock = false; }
        await product.save();
        try {
          const { getIO } = require('../config/socket');
          const payload = { _id: product._id, name: product.name, inStock: product.inStock, stockQty: product.stockQty };
          getIO().to('shop').emit('product-update', payload);
          getIO().to('admin').emit('product-update', payload);
        } catch (_) {}
      }
    }

    // 3. Prescription validation for Rx items
    let validRx = null;
    if (hasRxItems) {
      validRx = await findValidPrescription(req.user._id);
      if (!validRx) {
        const reason = await getPrescriptionBlockReason(req.user._id);
        throw ApiError.badRequest(reason);
      }

      // Validate cart Rx items against the prescription's approved medicines list (if attached)
      if (validRx.approvedMedicines?.length > 0) {
        const approvedIds = validRx.approvedMedicines.map(m => m.product.toString());
        const rxItems = await Promise.all(
          items.map(i => Product.findById(i.product).select('requiresPrescription name'))
        );
        const unapproved = rxItems.filter(p => p?.requiresPrescription && !approvedIds.includes(p._id.toString()));
        if (unapproved.length) {
          throw ApiError.badRequest(
            `These medicines are not in your approved prescription: ${unapproved.map(p => p.name).join(', ')}`
          );
        }
      }
    }

    // 4. Create order
    const deliveryFee    = subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
    const total          = subtotal + deliveryFee;
    const requiresCapture = hasRxItems; // Rx orders use authorize/capture

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      subtotal, deliveryFee, total,
      hostel, gate, note,
      paymentMethod: 'upi',
      paymentStatus: requiresCapture ? 'authorized' : 'paid',
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
      requiresCapture,
      prescription: validRx?._id,
    });

    // 5. Link prescription to order & increment usage
    if (validRx) {
      validRx.order  = order._id;
      validRx.orders = [...(validRx.orders || []), order._id];
      validRx.usageCount = (validRx.usageCount || 0) + 1;
      await validRx.save();
    }

    // 6. Notify admin
    try {
      const { getIO } = require('../config/socket');
      getIO().to('admin').emit('new-order', {
        orderId: order.orderId,
        total: order.total,
        items: order.items.length,
        gate: order.gate,
        requiresCapture,
      });
    } catch (_) {}

    ApiResponse.created(res, {
      orderId:        order.orderId,
      total:          order.total,
      status:         order.status,
      paymentStatus:  order.paymentStatus,
      requiresCapture,
    }, requiresCapture
      ? 'Payment authorized! Order will be confirmed once our pharmacist verifies your prescription.'
      : 'Payment verified & order placed!'
    );
  } catch (err) {
    next(err);
  }
};

module.exports = { initiatePayment, verifyAndCreateOrder };
