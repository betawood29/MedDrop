// Prescription model
// Status flow: pending → approved | rejected | clarification_required | partially_approved
// clarification_required allows re-review after user responds
// approved/partially_approved carry attached medicines, expiry, and reuse logic

const mongoose = require('mongoose');

const approvedMedicineSchema = new mongoose.Schema(
  {
    product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
    name: String,      // snapshot
    price: Number,     // snapshot
    image: String,     // snapshot
    quantity: { type: Number, default: 1 },
  },
  { _id: false }
);

const rejectedMedicineSchema = new mongoose.Schema(
  {
    name: String,      // medicine name from prescription
    reason: String,    // why it was not approved
  },
  { _id: false }
);

const prescriptionSchema = new mongoose.Schema(
  {
    prescriptionId: { type: String, unique: true },

    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },

    // Uploaded file
    fileUrl: { type: String, required: true },
    filePublicId: String,
    fileName: String,
    fileType: String,  // 'image' | 'pdf'

    // Patient note
    note: { type: String, maxlength: 500 },

    // ── Status ──────────────────────────────────────────────────────────
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'clarification_required', 'partially_approved'],
      default: 'pending',
    },

    // ── Admin review ─────────────────────────────────────────────────────
    adminNote: { type: String, maxlength: 500 },
    clarificationMessage: { type: String, maxlength: 1000 },
    reviewedAt: Date,
    reviewedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'Admin' },

    // Medicines admin attaches on approve / partial-approve
    approvedMedicines: [approvedMedicineSchema],
    // Medicines the admin explicitly rejected from the prescription
    rejectedMedicines: [rejectedMedicineSchema],

    // ── Validity / reusability ────────────────────────────────────────────
    expiresAt: Date,                              // set 90 days after approval
    isReusable: { type: Boolean, default: false },
    usageCount: { type: Number, default: 0 },
    maxUsage: { type: Number, default: 1 },       // 1 = single-use

    // ── Order linkage ─────────────────────────────────────────────────────
    // Primary (most recent) order — kept for backward compat
    order: { type: mongoose.Schema.Types.ObjectId, ref: 'Order' },
    // All orders placed with this prescription (for reusable Rx)
    orders: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Order' }],

    // ── Legacy delivery request ───────────────────────────────────────────
    deliveryRequest: {
      hostel: String,
      gate: String,
      note: String,
      status: {
        type: String,
        enum: ['requested', 'preparing', 'out', 'delivered'],
        default: 'requested',
      },
      requestedAt: { type: Date, default: Date.now },
    },
  },
  { timestamps: true }
);

// Auto-generate prescriptionId
const counterSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } });
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

// Virtual: is this prescription currently valid for ordering?
prescriptionSchema.virtual('isValid').get(function () {
  if (!['approved', 'partially_approved'].includes(this.status)) return false;
  if (this.expiresAt && this.expiresAt < new Date()) return false;
  if (!this.isReusable && this.usageCount >= this.maxUsage) return false;
  return true;
});

prescriptionSchema.index({ user: 1, createdAt: -1 });
prescriptionSchema.index({ status: 1, createdAt: -1 });

module.exports = mongoose.model('Prescription', prescriptionSchema);
