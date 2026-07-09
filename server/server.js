// MedDrop Server — Entry Point
// Express server with MongoDB, Socket.io, and all API routes

require('dotenv').config();

const express = require('express');
const http = require('http');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const compression = require('compression');
const path = require('path');

const connectDB = require('./config/db');
const { initSocket } = require('./config/socket');
const errorHandler = require('./middleware/errorHandler');
const { apiLimiter } = require('./middleware/rateLimiter');

// Route imports
const authRoutes = require('./routes/authRoutes');
const productRoutes = require('./routes/productRoutes');
const orderRoutes = require('./routes/orderRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const adminRoutes = require('./routes/adminRoutes');
const uploadRoutes = require('./routes/uploadRoutes');
const printRoutes = require('./routes/printRoutes');
const bannerRoutes = require('./routes/bannerRoutes');
const cartRoutes = require('./routes/cartRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const prescriptionRoutes = require('./routes/prescriptionRoutes');
const { getCategories, getSubCategories, getSubCategoryProducts, searchProducts, getTrendingByCategory, getTrendingProducts, getPopularSearches } = require('./controllers/productController');
const recommendationRoutes = require('./routes/recommendationRoutes');

const app = express();
const server = http.createServer(app);

// Initialize Socket.io
initSocket(server);

// Razorpay webhook — mounted before CORS/JSON parsing. It's a server-to-server call
// (no browser Origin header, so the CORS allowlist below would otherwise reject it) that
// authenticates itself via an HMAC signature over the raw request body, not via CORS or
// pre-parsed JSON — see controllers/webhookController.js for why raw() is required here.
const { razorpayWebhook } = require('./controllers/webhookController');
app.post('/api/payments/webhook', express.raw({ type: 'application/json' }), razorpayWebhook);

// Uploaded files (print store files) and the health check are also mounted before the
// strict CORS allowlist below. Both are meant to be reachable via plain links/direct
// requests (an <a href> view/download click, an uptime monitor) that don't carry a
// browser Origin header — in production the strict origin check requires one, so it
// would otherwise reject these with a CORS error before the request ever got here.
const uploadsDir = path.join(__dirname, '../uploads');
require('fs').mkdirSync(uploadsDir, { recursive: true });
app.use('/uploads', express.static(uploadsDir));
// A missing file falls through express.static's next() into whatever comes after it —
// without this, that would be the strict CORS middleware below, misreporting a 404 as
// "Not allowed by CORS".
app.use('/uploads', (req, res) => res.status(404).json({ success: false, message: 'File not found' }));
app.get('/api/health', cors(), (req, res) => {
  res.json({ success: true, message: 'MedDrop API is running', timestamp: new Date().toISOString() });
});

// --- Middleware ---
const allowedOrigins = [
  'http://localhost:5173',
  'http://localhost:5174',
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(cors({
  origin: (origin, cb) => {
    // In production, require an origin header; in dev, allow no-origin requests (curl, Postman)
    if (process.env.NODE_ENV !== 'production' && !origin) return cb(null, true);
    if (allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
  contentSecurityPolicy: false, // Allow loading images/fonts from Cloudinary and other CDNs
}));
app.use(compression());
app.use(morgan(process.env.NODE_ENV === 'production' ? 'combined' : 'dev'));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));

// Sanitize user input — prevent NoSQL injection ($gt, $ne, etc. in query params/body)
app.use((req, res, next) => {
  const sanitize = (obj) => {
    if (typeof obj !== 'object' || obj === null) return obj;
    for (const key of Object.keys(obj)) {
      if (key.startsWith('$')) { delete obj[key]; continue; }
      if (typeof obj[key] === 'object') sanitize(obj[key]);
    }
    return obj;
  };
  if (req.body) sanitize(req.body);
  if (req.query) sanitize(req.query);
  if (req.params) sanitize(req.params);
  next();
});

// Rate limiting on all API routes
app.use('/api', apiLimiter);

// --- API Routes ---
app.use('/api/auth', authRoutes);
app.get('/api/products/trending/all', (req, res, next) => getTrendingProducts(req, res, next));
app.get('/api/products/trending', (req, res, next) => getTrendingByCategory(req, res, next));
app.use('/api/products', productRoutes);
app.use('/api/categories', (req, res, next) => getCategories(req, res, next));
app.get('/api/search/popular', (req, res, next) => getPopularSearches(req, res, next));
app.get('/api/search', (req, res, next) => searchProducts(req, res, next));
app.get('/api/subcategories/:slug/products', (req, res, next) => getSubCategoryProducts(req, res, next));
app.get('/api/subcategories', (req, res, next) => getSubCategories(req, res, next));
app.use('/api/recommendations', recommendationRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);
app.use('/api/print', printRoutes);
app.use('/api/banner', bannerRoutes);
app.use('/api/cart', cartRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/feedback', feedbackRoutes);
app.use('/api/prescriptions', prescriptionRoutes);

// 404 handler for unknown routes
app.use('/api/*', (req, res) => {
  res.status(404).json({ success: false, message: 'API route not found' });
});

// Global error handler (must be last)
app.use(errorHandler);

// --- Start Server ---
const PORT = process.env.PORT || 5000;

const startServer = async () => {
  await connectDB();

  server.listen(PORT, () => {
    console.log(`MedDrop Server running on port ${PORT} [${process.env.NODE_ENV || 'development'}]`);
  });
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('Unhandled Rejection:', err.message);
  server.close(() => process.exit(1));
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('Uncaught Exception:', err.message);
  process.exit(1);
});

module.exports = { app, server };
