// User model — stores student info, phone (used for auth), hostel, and preferred gate
// role: "user" (default) or "admin"

const mongoose = require('mongoose');

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      default: '',
      trim: true,
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      unique: true,
      match: [/^\d{10}$/, 'Phone must be 10 digits'],
    },
    hostel: {
      type: String,
      trim: true,
    },
    preferredGate: {
      type: String,
      enum: ['Main Gate', 'Back Gate', 'Side Gate (Library)'],
    },
    role: {
      type: String,
      enum: ['user', 'admin'],
      default: 'user',
    },
    firebaseUid: {
      type: String,
    },
    isBlocked: {
      type: Boolean,
      default: false,
    },
    cart: [
      {
        product: { type: mongoose.Schema.Types.ObjectId, ref: 'Product' },
        quantity: { type: Number, default: 1, min: 1 },
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model('User', userSchema);
