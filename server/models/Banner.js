// Banner model — hero banner content managed from admin dashboard

const mongoose = require('mongoose');

const bannerSchema = new mongoose.Schema(
  {
    title: { type: String, required: true, default: 'Medicines & Essentials' },
    highlight: { type: String, required: true, default: 'delivered to your gate' },
    subtitle: { type: String, default: 'Chitkara University Campus Delivery' },
    image: { type: String, default: '/bannerimg.jpg' },
    link: { type: String, default: '/category/all' },
    features: [{ type: String }],
    isActive: { type: Boolean, default: true },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Banner', bannerSchema);
