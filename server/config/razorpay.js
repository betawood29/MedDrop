// Razorpay instance for payment processing
// Set RAZORPAY_KEY_ID and RAZORPAY_KEY_SECRET in .env

const Razorpay = require('razorpay');

let razorpayInstance = null;

if (process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET) {
  razorpayInstance = new Razorpay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
  });
  console.log('Razorpay initialized');
} else {
  console.log('Razorpay credentials not set — payments will be unavailable');
}

module.exports = razorpayInstance;
