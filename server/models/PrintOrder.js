// PrintOrder model — stores print/photocopy requests from students
// Tracks uploaded files, print config (copies, color, sides), and delivery details

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
        url: { type: String, required: true }, // Cloudinary URL
        pages: { type: Number, default: 1 },
        size: { type: Number }, // bytes
      },
    ],
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

// Calculate pricing before save
printOrderSchema.pre('save', function (next) {
  if (this.isModified('config') || this.isModified('files') || this.isModified('totalPages')) {
    const basePrice = this.config.colorMode === 'color' ? 5 : 2;
    const sideMultiplier = this.config.sides === 'double' ? 0.75 : 1;
    this.pricePerPage = Math.round(basePrice * sideMultiplier);
    this.subtotal = this.totalPages * this.config.copies * this.pricePerPage;
    this.total = this.subtotal + this.deliveryFee;
  }
  next();
});

printOrderSchema.index({ user: 1, createdAt: -1 });

module.exports = mongoose.model('PrintOrder', printOrderSchema);
