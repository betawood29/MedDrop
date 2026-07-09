// Razorpay webhook — reconciliation safety net for when the client never calls
// /api/payments/verify after paying (closed tab, crash, flaky network mid-checkout).
// Configure this URL + a webhook secret in the Razorpay dashboard (Settings > Webhooks).
//
// IMPORTANT: this route must be mounted with a raw body parser BEFORE the global
// express.json() middleware (see server.js) — the signature is an HMAC over the exact
// raw request bytes, so a pre-parsed/re-serialized body would fail verification.

const crypto = require('crypto');
const Order = require('../models/Order');
const PrintOrder = require('../models/PrintOrder');
const PendingPayment = require('../models/PendingPayment');
const { finalizeOrder, emitOrderSideEffects } = require('../services/orderFulfillmentService');

// Only these events can ever need to create an order; everything else (refund.*,
// order.paid, etc.) is acknowledged and ignored.
const HANDLED_EVENTS = new Set(['payment.captured', 'payment.authorized']);

const razorpayWebhook = async (req, res) => {
  try {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) {
      console.error('[Razorpay webhook] RAZORPAY_WEBHOOK_SECRET not configured — rejecting');
      return res.status(500).json({ success: false });
    }

    const signature = req.headers['x-razorpay-signature'];
    const expected = crypto.createHmac('sha256', secret).update(req.body).digest('hex');
    const expectedBuf = Buffer.from(expected, 'utf8');
    const providedBuf = Buffer.from(String(signature || ''), 'utf8');
    const valid = expectedBuf.length === providedBuf.length && crypto.timingSafeEqual(expectedBuf, providedBuf);

    if (!valid) {
      console.error('[Razorpay webhook] invalid signature — rejecting');
      return res.status(400).json({ success: false, message: 'Invalid signature' });
    }

    const event = JSON.parse(req.body.toString('utf8'));
    if (!HANDLED_EVENTS.has(event.event)) {
      return res.json({ success: true }); // ack — nothing to reconcile for this event type
    }

    const payment = event.payload?.payment?.entity;
    if (!payment?.id || !payment?.order_id) return res.json({ success: true });

    // Client already completed the order via /payments/verify — nothing to reconcile.
    const [alreadyOrder, alreadyPrintOrder] = await Promise.all([
      Order.findOne({ razorpayPaymentId: payment.id }),
      PrintOrder.findOne({ razorpayPaymentId: payment.id }),
    ]);
    if (alreadyOrder || alreadyPrintOrder) return res.json({ success: true });

    const pending = await PendingPayment.findOne({ razorpayOrderId: payment.order_id });
    if (!pending) {
      // Either already reconciled and the PendingPayment cleaned up elsewhere, or an
      // order this old fell outside the 24h TTL window — flag for manual follow-up.
      console.error(
        `[Razorpay webhook] payment ${payment.id} (order ${payment.order_id}) has no ` +
        `pending-order context — verify manually in the Razorpay dashboard`
      );
      return res.json({ success: true });
    }

    const { order, printOrder, requiresCapture, socketUpdates, alreadyProcessed } = await finalizeOrder({
      userId: pending.user,
      items: pending.items,
      printOrder: pending.printOrder,
      hostel: pending.hostel,
      gate: pending.gate,
      note: pending.note,
      razorpayOrderId: payment.order_id,
      razorpayPaymentId: payment.id,
    });

    if (!alreadyProcessed) {
      console.log(`[Razorpay webhook] reconciled order ${order?.orderId || printOrder?.orderId} — client never called /verify`);
      emitOrderSideEffects({ order, printOrder, requiresCapture, socketUpdates });
    }

    res.json({ success: true });
  } catch (err) {
    // Ack anyway — Razorpay retries aggressively on non-2xx, and a validation failure
    // here (e.g. a product deactivated since checkout started) won't succeed on retry
    // either. Log it for manual follow-up instead of causing a retry storm.
    console.error('[Razorpay webhook] error handling event:', err.message);
    res.json({ success: true });
  }
};

module.exports = { razorpayWebhook };
