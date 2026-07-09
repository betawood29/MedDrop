// Payment controller — Razorpay payment initiation and verification
//
// Shop items and a print order (if present) are paid for together in ONE Razorpay
// payment, with a single combined delivery fee — see services/orderFulfillmentService.js
// for how the two are priced and created atomically.
//
// Rx-order flow (authorize/capture):
//   1. initiatePayment  → detects Rx items → creates Razorpay order with payment_capture:0
//   2. verifyAndCreateOrder → verifies signature → creates Order (paymentStatus:'authorized', requiresCapture:true)
//   3. Admin confirms order → adminController.updateOrderStatus captures payment → paymentStatus:'paid'
//
// Non-Rx flow (immediate capture):
//   1. initiatePayment  → payment_capture:1
//   2. verifyAndCreateOrder → paymentStatus:'paid' immediately
//
// If the client never calls verifyAndCreateOrder after paying (closed tab, crash, flaky
// network), the Razorpay webhook (controllers/webhookController.js) reconciles it later
// using the same finalizeOrder() logic, keyed off the PendingPayment snapshot saved below.

const Product        = require('../models/Product');
const PendingPayment = require('../models/PendingPayment');
const { createRazorpayOrder, verifyPayment } = require('../services/paymentService');
const {
  finalizeOrder, emitOrderSideEffects, findValidPrescription, getPrescriptionBlockReason,
  DELIVERY_FEE, FREE_DELIVERY_MIN,
} = require('../services/orderFulfillmentService');
const { computePrintSubtotal } = require('../services/printPricingService');
const ApiResponse  = require('../utils/apiResponse');
const ApiError     = require('../utils/apiError');

// ─── POST /api/payments/initiate ────────────────────────────────────────────

const initiatePayment = async (req, res, next) => {
  try {
    const { items = [], printOrder, hostel, gate, note } = req.body;
    if (!items.length && !printOrder) throw ApiError.badRequest('Items are required');
    if (!hostel || !gate) throw ApiError.badRequest('Hostel and gate are required');
    if (printOrder && (!printOrder.files?.length || printOrder.files.length !== printOrder.fileConfigs?.length)) {
      throw ApiError.badRequest('Print files are required');
    }

    let shopSubtotal = 0;
    let hasRxItems = false;

    for (const item of items) {
      const product = await Product.findById(item.product).select('name price isActive inStock stockQty requiresPrescription');
      if (!product) throw ApiError.badRequest(`Product not found: ${item.product}`);
      if (!product.isActive || !product.inStock) throw ApiError.badRequest(`${product.name} is currently unavailable`);
      if (product.stockQty > 0 && product.stockQty < item.quantity) {
        throw ApiError.badRequest(`Only ${product.stockQty} unit(s) of ${product.name} available`);
      }
      shopSubtotal += product.price * item.quantity;
      if (product.requiresPrescription) hasRxItems = true;
    }

    // Block checkout if prescription status is not valid for Rx items
    if (hasRxItems) {
      const validRx = await findValidPrescription(req.user._id);
      if (!validRx) {
        const { message, rxStatus } = await getPrescriptionBlockReason(req.user._id);
        throw ApiError.prescriptionRequired(message, rxStatus);
      }
    }

    const { subtotal: printSubtotal } = printOrder ? computePrintSubtotal(printOrder.fileConfigs) : { subtotal: 0 };
    const subtotal      = shopSubtotal + printSubtotal;
    const deliveryFee    = subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
    const total          = subtotal + deliveryFee;
    const receipt        = `pre_${Date.now()}`;
    // Rx orders: authorize only (payment_capture:0); non-Rx: immediate capture
    const razorpayOrder = await createRazorpayOrder(total, receipt, hasRxItems);

    // Snapshot cart/delivery context (+ already-uploaded print file metadata) so the
    // webhook can finalize the order even if the client never calls back after paying.
    await PendingPayment.findOneAndUpdate(
      { razorpayOrderId: razorpayOrder.id },
      {
        user: req.user._id, items, hostel, gate, note,
        printOrder: printOrder ? { files: printOrder.files, fileConfigs: printOrder.fileConfigs } : undefined,
      },
      { upsert: true }
    );

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
      items = [], printOrder, hostel, gate, note,
    } = req.body;

    if (!razorpay_order_id || !razorpay_payment_id || !razorpay_signature) {
      throw ApiError.badRequest('All payment verification fields are required');
    }
    if (!items.length && !printOrder) throw ApiError.badRequest('Items are required');

    // Verify signature
    verifyPayment(razorpay_order_id, razorpay_payment_id, razorpay_signature);

    const { order, printOrder: createdPrintOrder, requiresCapture, socketUpdates, alreadyProcessed } = await finalizeOrder({
      userId: req.user._id,
      items, hostel, gate, note, printOrder,
      razorpayOrderId: razorpay_order_id,
      razorpayPaymentId: razorpay_payment_id,
    });

    if (!alreadyProcessed) {
      emitOrderSideEffects({ order, printOrder: createdPrintOrder, requiresCapture, socketUpdates });
    }

    ApiResponse.created(res, {
      orderId:        order?.orderId,
      total:          order?.total,
      status:         order?.status,
      paymentStatus:  order?.paymentStatus,
      printOrderId:   createdPrintOrder?.orderId,
      printTotal:     createdPrintOrder?.total,
      requiresCapture,
    }, alreadyProcessed
      ? 'Order already placed for this payment'
      : requiresCapture
        ? 'Payment authorized! Order will be confirmed once our pharmacist verifies your prescription.'
        : 'Payment verified & order placed!'
    );
  } catch (err) {
    next(err);
  }
};

module.exports = { initiatePayment, verifyAndCreateOrder };
