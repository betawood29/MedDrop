const mongoose = require('mongoose');

const feedbackSchema = new mongoose.Schema(
  {
    user: { type: mongoose.Schema.Types.ObjectId, ref: 'User' },
    name: { type: String, trim: true },
    phone: { type: String, trim: true },
    type: {
      type: String,
      enum: ['suggestion', 'complaint', 'bug', 'general'],
      default: 'general',
    },
    message: { type: String, required: true, trim: true, maxlength: 1000 },
    status: { type: String, enum: ['new', 'read', 'resolved'], default: 'new' },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Feedback', feedbackSchema);
