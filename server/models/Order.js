// Order model — tracks a student's order from placement to delivery at the gate
// orderId is auto-generated as "MD" + 6-digit number (e.g., MD000001)
// statusHistory keeps a log of all status transitions

const mongoose = require('mongoose');

const orderItemSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,     // snapshot of product name at order time
    price: Number,    // snapshot of price at order time
    quantity: Number,
    image: String,
  },
  { _id: false }
);

const statusHistorySchema = new mongoose.Schema(
  {
    status: String,
    timestamp: { type: Date, default: Date.now },
    note: String,
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderId: {
      type: String,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    items: [orderItemSchema],
    subtotal: {
      type: Number,
      required: true,
    },
    deliveryFee: {
      type: Number,
      required: true,
    },
    total: {
      type: Number,
      required: true,
    },
    status: {
      type: String,
      enum: ['placed', 'confirmed', 'packed', 'out', 'gate', 'delivered', 'cancelled'],
      default: 'placed',
    },
    statusHistory: [statusHistorySchema],
    hostel: {
      type: String,
      required: [true, 'Hostel is required'],
    },
    gate: {
      type: String,
      required: [true, 'Gate is required'],
    },
    note: String,
    paymentMethod: {
      type: String,
      enum: ['upi', 'cod'],
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'authorized', 'paid', 'failed', 'refunded'],
      default: 'pending',
    },
    razorpayOrderId: String,
    razorpayPaymentId: String,
    // For Rx orders: payment is authorized (not captured) until admin confirms
    requiresCapture: { type: Boolean, default: false },
    // Prescription used for this order (for traceability)
    prescription: { type: mongoose.Schema.Types.ObjectId, ref: 'Prescription' },
  },
  { timestamps: true }
);

// Auto-generate orderId using atomic counter to prevent race conditions
// Uses a separate Counter collection with findOneAndUpdate (atomic)
const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

orderSchema.pre('save', async function (next) {
  if (!this.orderId) {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'orderId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.orderId = 'MD' + String(counter.seq).padStart(6, '0');
  }
  next();
});

// Push initial status to history on create
orderSchema.pre('save', function (next) {
  if (this.isNew) {
    this.statusHistory.push({ status: this.status, note: 'Order placed' });
  }
  next();
});

orderSchema.index({ user: 1, createdAt: -1 });
orderSchema.index({ status: 1 });

module.exports = mongoose.model('Order', orderSchema);
