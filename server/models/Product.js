// Product model — items available for purchase (medicines, snacks, essentials, etc.)
// Linked to Category via ObjectId. Supports stock tracking and prescription flagging.

const mongoose = require('mongoose');

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true,
    },
    description: {
      type: String,
      trim: true,
    },
    price: {
      type: Number,
      required: [true, 'Price is required'],
      min: [0, 'Price cannot be negative'],
    },
    mrp: {
      type: Number,
      min: 0,
    },
    category: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Category',
      required: [true, 'Category is required'],
    },
    subCategory: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'SubCategory',
    },
    image: {
      type: String, // Cloudinary URL
    },
    inStock: {
      type: Boolean,
      default: true,
    },
    stockQty: {
      type: Number,
      default: 0,
    },
    requiresPrescription: {
      type: Boolean,
      default: false,
    },
    tags: [String],
    isActive: {
      type: Boolean,
      default: true,
    },
  },
  { timestamps: true }
);

// Index for search and filtering
productSchema.index({ name: 'text', tags: 'text', description: 'text' });
productSchema.index({ category: 1, isActive: 1 });
productSchema.index({ subCategory: 1, isActive: 1 });

module.exports = mongoose.model('Product', productSchema);
