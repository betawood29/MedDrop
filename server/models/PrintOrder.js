// PrintOrder model — stores print/photocopy requests from students
// Tracks uploaded files with per-file config, and delivery details

const mongoose = require('mongoose');

const printOrderSchema = new mongoose.Schema(
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
    files: [
      {
        originalName: { type: String, required: true },
        url: { type: String, required: true },
        size: { type: Number },
        pages: { type: Number, default: 1 },
        copies: { type: Number, default: 1 },
        colorMode: { type: String, enum: ['bw', 'color'], default: 'bw' },
        sides: { type: String, enum: ['single', 'double'], default: 'single' },
        orientation: { type: String, enum: ['portrait', 'landscape'], default: 'portrait' },
      },
    ],
    // Legacy global config (kept for backward compat with old orders)
    config: {
      copies: { type: Number, default: 1, min: 1, max: 50 },
      colorMode: { type: String, enum: ['bw', 'color'], default: 'bw' },
      sides: { type: String, enum: ['single', 'double'], default: 'single' },
      paperSize: { type: String, enum: ['A4', 'A3', 'Letter'], default: 'A4' },
    },
    totalPages: { type: Number, default: 0 },
    pricePerPage: { type: Number, default: 0 },
    subtotal: { type: Number, default: 0 },
    deliveryFee: { type: Number, default: 25 },
    total: { type: Number, default: 0 },
    note: { type: String, trim: true },
    hostel: { type: String },
    gate: { type: String },
    status: {
      type: String,
      enum: ['placed', 'printing', 'ready', 'out', 'delivered', 'cancelled'],
      default: 'placed',
    },
    paymentMethod: {
      type: String,
      enum: ['cod'],
      default: 'cod',
    },
  },
  { timestamps: true }
);

// Auto-generate orderId
printOrderSchema.pre('save', async function (next) {
  if (!this.orderId) {
    const count = await this.constructor.countDocuments();
    this.orderId = `PR${String(count + 1).padStart(6, '0')}`;
  }
  next();
});

// Calculate pricing before save — uses per-file config if available
printOrderSchema.pre('save', function (next) {
  if (this.isModified('files') || this.isModified('totalPages') || this.isModified('config')) {
    let subtotal = 0;
    let totalPg = 0;

    // Per-file pricing
    if (this.files && this.files.length > 0 && this.files[0].pages) {
      this.files.forEach((f) => {
        const basePrice = f.colorMode === 'color' ? 5 : 2;
        const sideMultiplier = f.sides === 'double' ? 0.75 : 1;
        const ppp = basePrice * sideMultiplier;
        const pages = f.pages || 1;
        const copies = f.copies || 1;
        subtotal += Math.round(pages * copies * ppp);
        totalPg += pages * copies;
      });
      this.totalPages = totalPg;
      this.pricePerPage = this.files.length > 0 ? Math.round(subtotal / totalPg) : 0;
    } else {
      // Legacy: global config pricing
      const basePrice = this.config.colorMode === 'color' ? 5 : 2;
      const sideMultiplier = this.config.sides === 'double' ? 0.75 : 1;
      this.pricePerPage = Math.round(basePrice * sideMultiplier);
      subtotal = this.totalPages * this.config.copies * this.pricePerPage;
    }

    this.subtotal = subtotal;
    this.total = this.subtotal + this.deliveryFee;
  }
  next();
});

printOrderSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('PrintOrder', printOrderSchema);
