// Pending payment — snapshot of cart/delivery context saved when a Razorpay order is
// created (initiatePayment), so the webhook can reconstruct and finalize an order if the
// client never calls /payments/verify (closed tab, crash, network drop after paying).
// Auto-expires after 24h via TTL index — by then either the order was created or the
// Razorpay order itself has gone stale.

const mongoose = require('mongoose');

const pendingPaymentSchema = new mongoose.Schema({
  razorpayOrderId: { type: String, required: true, unique: true },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  items: [
    {
      product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product', required: true },
      quantity: { type: Number, required: true },
      _id: false,
    },
  ],
  hostel: String,
  gate: String,
  note: String,
  // Present only when a print order was bundled into this payment — files were already
  // uploaded (via /print/upload-files) before payment, so only their metadata + the
  // per-file print settings need to survive here for webhook reconciliation.
  printOrder: {
    type: {
      files: [
        {
          originalName: String,
          url: String,
          size: Number,
          _id: false,
        },
      ],
      fileConfigs: [
        {
          pages: Number,
          copies: Number,
          colorMode: String,
          sides: String,
          orientation: String,
          _id: false,
        },
      ],
    },
    default: undefined,
  },
  createdAt: { type: Date, default: Date.now, expires: 60 * 60 * 24 },
});

module.exports = mongoose.model('PendingPayment', pendingPaymentSchema);
