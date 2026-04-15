// Prescription model — tracks uploaded prescriptions for Rx medicines
// Status flow: pending → approved/rejected
// Linked to user; optionally linked to an order after approval

const mongoose = require('mongoose');

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionId: {
      type: String,
      unique: true,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    // Cloudinary URL of the uploaded prescription image or PDF
    fileUrl: {
      type: String,
      required: true,
    },
    filePublicId: {
      type: String, // Cloudinary public_id for deletion
    },
    fileName: {
      type: String,
    },
    fileType: {
      type: String, // 'image' | 'pdf'
    },
    // Patient note — e.g. "For headache medicine" or doctor name
    note: {
      type: String,
      maxlength: 500,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected'],
      default: 'pending',
    },
    // Admin review fields
    adminNote: {
      type: String, // Rejection reason or approval note
      maxlength: 500,
    },
    reviewedAt: {
      type: Date,
    },
    reviewedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Admin',
    },
    // Optional: link to order placed using this prescription
    order: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
    },
  },
  { timestamps: true }
);

// Auto-generate prescriptionId
const counterSchema = new mongoose.Schema({
  _id: String,
  seq: { type: Number, default: 0 },
});
const Counter = mongoose.models.Counter || mongoose.model('Counter', counterSchema);

prescriptionSchema.pre('save', async function (next) {
  if (!this.prescriptionId) {
    const counter = await Counter.findOneAndUpdate(
      { _id: 'prescriptionId' },
      { $inc: { seq: 1 } },
      { new: true, upsert: true }
    );
    this.prescriptionId = 'RX' + String(counter.seq).padStart(5, '0');
  }
  next();
});

prescriptionSchema.index({ user: 1, createdAt: -1 });
prescriptionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
