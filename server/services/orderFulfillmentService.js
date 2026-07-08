// Order fulfillment service — the core "turn a verified payment into an order" logic.
// Shared by the client-driven POST /payments/verify flow and the Razorpay webhook
// fallback (for when the client never calls back after paying — closed tab, crash,
// flaky network), so both paths get identical atomicity/idempotency/Rx-validation
// guarantees instead of two copies that can drift out of sync.

const mongoose     = require('mongoose');
const Order        = require('../models/Order');
const Product      = require('../models/Product');
const Prescription = require('../models/Prescription');
const ApiError     = require('../utils/apiError');

const DELIVERY_FEE      = 20;
const FREE_DELIVERY_MIN = 199;

// Find the most recent valid prescription for the given user.
// Uses $ne / null comparisons instead of $exists:false — more robust when Mongoose
// stores unset ObjectId fields as null rather than omitting them entirely.
const findValidPrescription = async (userId) => {
  const now = new Date();
  return Prescription.findOne({
    user: userId,
    status: { $in: ['approved', 'partially_approved'] },
    $and: [
      // Not expired  — null/missing expiresAt means no expiry was set (old docs) → still valid
      { $or: [{ expiresAt: { $gt: now } }, { expiresAt: null }] },
      {
        $or: [
          // Reusable path: has remaining uses
          {
            isReusable: true,
            $expr: { $lt: ['$usageCount', '$maxUsage'] },
          },
          // Single-use path: no linked order, no legacy delivery request
          // null matches both explicitly-null AND missing fields
          {
            isReusable: { $ne: true },        // false | null | missing
            order: null,                       // not linked to any order yet
            'deliveryRequest.hostel': null,    // no legacy delivery request
          },
        ],
      },
    ],
  }).sort({ createdAt: -1 });
};

// Describe why the user has no valid prescription — returns { message, rxStatus }
const getPrescriptionBlockReason = async (userId) => {
  const latest = await Prescription.findOne({ user: userId }).sort({ createdAt: -1 }).lean();
  if (!latest)
    return { message: 'No prescription uploaded. Please upload one to order prescription medicines.', rxStatus: 'none' };
  if (latest.status === 'pending')
    return { message: 'Your prescription is still under review. You can proceed once our pharmacist approves it.', rxStatus: 'pending' };
  if (latest.status === 'clarification_required')
    return { message: 'Our pharmacist needs clarification on your prescription. Please check the Prescription page and respond.', rxStatus: 'clarification_required' };
  if (latest.status === 'rejected')
    return { message: `Your prescription was rejected. ${latest.adminNote ? `Reason: ${latest.adminNote}. ` : ''}Please upload a new one.`, rxStatus: 'rejected' };
  if (latest.expiresAt && latest.expiresAt < new Date())
    return { message: 'Your prescription has expired (90-day validity). Please upload a fresh prescription.', rxStatus: 'none' };
  return { message: 'No valid prescription found. Please upload an approved prescription to order medicines.', rxStatus: 'none' };
};

// Turns a verified/authenticated payment into an order. Idempotent on razorpayPaymentId.
// Returns { order, requiresCapture, socketUpdates, alreadyProcessed }.
// Throws ApiError on validation failure (unavailable item, Rx block, lost stock race) —
// callers decide what that means for their response (client call → error response;
// webhook → log for manual follow-up).
const finalizeOrder = async ({ userId, items, hostel, gate, note, razorpayOrderId, razorpayPaymentId }) => {
  const existing = await Order.findOne({ razorpayPaymentId });
  if (existing) return { order: existing, requiresCapture: existing.requiresCapture, socketUpdates: [], alreadyProcessed: true };

  // Validation, Rx check, stock reservation, and order creation all run in one
  // transaction. If anything fails partway (unavailable item, failed Rx check, lost
  // stock race, order save error), ALL of it rolls back together instead of leaving
  // stock decremented with no order to show for it.
  const session = await mongoose.startSession();
  let order, requiresCapture, socketUpdates;

  try {
    await session.withTransaction(async () => {
      socketUpdates = [];
      const orderItems = [];
      const productDocs = [];
      let subtotal = 0;
      let hasRxItems = false;

      for (const item of items) {
        const product = await Product.findById(item.product).session(session);
        if (!product || !product.isActive || !product.inStock) {
          throw ApiError.badRequest(`${product?.name || item.product} is unavailable`);
        }
        if (product.stockQty > 0 && product.stockQty < item.quantity) {
          throw ApiError.badRequest(`Only ${product.stockQty} unit(s) of ${product.name} available`);
        }
        subtotal += product.price * item.quantity;
        if (product.requiresPrescription) hasRxItems = true;
        orderItems.push({
          product: product._id, name: product.name, price: product.price,
          quantity: item.quantity, image: product.image, stockDeducted: product.stockQty > 0,
        });
        productDocs.push({ product, quantity: item.quantity });
      }

      // Prescription validation for Rx items — before any stock mutation
      let validRx = null;
      if (hasRxItems) {
        validRx = await findValidPrescription(userId);
        if (!validRx) {
          const { message, rxStatus } = await getPrescriptionBlockReason(userId);
          throw ApiError.prescriptionRequired(message, rxStatus);
        }

        if (validRx.approvedMedicines?.length > 0) {
          const approvedIds = validRx.approvedMedicines.map(m => m.product.toString());
          const rxItems = await Promise.all(
            items.map(i => Product.findById(i.product).select('requiresPrescription name').session(session))
          );
          const unapproved = rxItems.filter(p => p?.requiresPrescription && !approvedIds.includes(p._id.toString()));
          if (unapproved.length) {
            throw ApiError.badRequest(
              `These medicines are not in your approved prescription: ${unapproved.map(p => p.name).join(', ')}`
            );
          }
        }
      }

      // Atomically reserve stock — findOneAndUpdate's filter re-checks stockQty at
      // write time, so two concurrent orders for the last unit can't both succeed.
      for (const { product, quantity } of productDocs) {
        if (product.stockQty > 0) {
          const updated = await Product.findOneAndUpdate(
            { _id: product._id, stockQty: { $gte: quantity } },
            { $inc: { stockQty: -quantity, orderCount: quantity }, $set: { lastOrderedAt: new Date() } },
            { new: true, session }
          );
          if (!updated) {
            throw ApiError.badRequest(`Only a few units of ${product.name} are left — please update your cart and try again`);
          }
          if (updated.stockQty <= 0 && updated.inStock) {
            await Product.updateOne({ _id: updated._id }, { inStock: false }, { session });
            updated.inStock = false;
          }
          socketUpdates.push({ _id: updated._id, name: updated.name, inStock: updated.inStock, stockQty: updated.stockQty });
        } else {
          await Product.updateOne(
            { _id: product._id },
            { $inc: { orderCount: quantity }, $set: { lastOrderedAt: new Date() } },
            { session }
          );
        }
      }

      // Create order
      const deliveryFee = subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
      const total = subtotal + deliveryFee;
      requiresCapture = hasRxItems; // Rx orders use authorize/capture

      const created = await Order.create([{
        user: userId,
        items: orderItems,
        subtotal, deliveryFee, total,
        hostel, gate, note,
        paymentMethod: 'upi',
        paymentStatus: requiresCapture ? 'authorized' : 'paid',
        razorpayOrderId, razorpayPaymentId,
        requiresCapture,
        prescription: validRx?._id,
      }], { session });
      order = created[0];

      // Link prescription to order & increment usage
      if (validRx) {
        validRx.order  = order._id;
        validRx.orders = [...(validRx.orders || []), order._id];
        validRx.usageCount = (validRx.usageCount || 0) + 1;
        await validRx.save({ session });
      }
    });
  } catch (err) {
    // A concurrent identical retry can lose the race on the unique razorpayPaymentId
    // index — that's a success (the other request's order stands), not a failure.
    if (err?.code === 11000) {
      const winner = await Order.findOne({ razorpayPaymentId });
      if (winner) return { order: winner, requiresCapture: winner.requiresCapture, socketUpdates: [], alreadyProcessed: true };
    }
    throw err;
  } finally {
    session.endSession();
  }

  return { order, requiresCapture, socketUpdates, alreadyProcessed: false };
};

// Post-commit real-time notifications — fire-and-forget, never block the caller's response.
const emitOrderSideEffects = (order, requiresCapture, socketUpdates) => {
  try {
    const { getIO } = require('../config/socket');
    const io = getIO();
    (socketUpdates || []).forEach((payload) => {
      io.to('shop').emit('product-update', payload);
      io.to('admin').emit('product-update', payload);
    });
    io.to('admin').emit('new-order', {
      orderId: order.orderId, total: order.total, items: order.items.length, gate: order.gate, requiresCapture,
    });
  } catch (_) {}
};

module.exports = {
  finalizeOrder,
  emitOrderSideEffects,
  findValidPrescription,
  getPrescriptionBlockReason,
  DELIVERY_FEE,
  FREE_DELIVERY_MIN,
};
