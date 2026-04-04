// Admin controller — dashboard stats, order management, product CRUD, category CRUD
// All routes require admin authentication

const jwt = require('jsonwebtoken');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Category = require('../models/Category');
const Admin = require('../models/Admin');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { productSchema, categorySchema } = require('../utils/validators');

// POST /api/admin/login — admin login with phone + password
const adminLogin = async (req, res, next) => {
  try {
    const { phone, password } = req.body;
    if (!phone || !password) throw ApiError.badRequest('Phone and password are required');

    const admin = await Admin.findOne({ phone });
    if (!admin) throw ApiError.unauthorized('Invalid credentials');

    const isMatch = await admin.comparePassword(password);
    if (!isMatch) throw ApiError.unauthorized('Invalid credentials');

    const token = jwt.sign(
      { id: admin._id, isAdmin: true },
      process.env.JWT_SECRET,
      { expiresIn: '7d' }
    );

    ApiResponse.success(res, { token, admin: { id: admin._id, name: admin.name, phone: admin.phone } }, 'Admin login successful');
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/dashboard — rich stats with date range support
// Query params: range=7d|15d|30d|custom, from=YYYY-MM-DD, to=YYYY-MM-DD
const getDashboard = async (req, res, next) => {
  try {
    const { range = '7d', from, to } = req.query;
    const User = require('../models/User');

    // Calculate date range
    const now = new Date();
    let rangeStart;
    let rangeEnd = new Date(now);
    rangeEnd.setHours(23, 59, 59, 999);

    if (range === 'custom' && from && to) {
      rangeStart = new Date(from);
      rangeStart.setHours(0, 0, 0, 0);
      rangeEnd = new Date(to);
      rangeEnd.setHours(23, 59, 59, 999);
    } else {
      const days = range === '15d' ? 15 : range === '30d' ? 30 : 7;
      rangeStart = new Date(now);
      rangeStart.setDate(rangeStart.getDate() - days);
      rangeStart.setHours(0, 0, 0, 0);
    }

    // Today boundaries
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0);

    const rangeMatch = { createdAt: { $gte: rangeStart, $lte: rangeEnd } };
    const rangeMatchNotCancelled = { createdAt: { $gte: rangeStart, $lte: rangeEnd }, status: { $ne: 'cancelled' } };

    const [
      todayOrders,
      todayRevAgg,
      pendingOrders,
      totalProducts,
      outOfStockProducts,
      totalUsers,
      rangeOrders,
      rangeRevenueAgg,
      rangeCancelledOrders,
      rangeDeliveredOrders,
      dailyTrend,
      topProducts,
      orderStatusBreakdown,
      revenueByPayment,
      avgOrderValueAgg,
      peakHoursAgg,
    ] = await Promise.all([
      // Today stats
      Order.countDocuments({ createdAt: { $gte: todayStart } }),
      Order.aggregate([
        { $match: { createdAt: { $gte: todayStart }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.countDocuments({ status: { $in: ['placed', 'confirmed', 'packed'] } }),
      Product.countDocuments({ isActive: true }),
      Product.countDocuments({ isActive: true, inStock: false }),
      User.countDocuments(),

      // Range stats
      Order.countDocuments(rangeMatch),
      Order.aggregate([
        { $match: rangeMatchNotCancelled },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      Order.countDocuments({ ...rangeMatch, status: 'cancelled' }),
      Order.countDocuments({ ...rangeMatch, status: 'delivered' }),

      // Daily trend (orders + revenue per day)
      Order.aggregate([
        { $match: { createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
        {
          $group: {
            _id: { $dateToString: { format: '%Y-%m-%d', date: '$createdAt' } },
            orders: { $sum: 1 },
            revenue: { $sum: { $cond: [{ $ne: ['$status', 'cancelled'] }, '$total', 0] } },
          },
        },
        { $sort: { _id: 1 } },
      ]),

      // Top 5 most bought products (by quantity sold in range)
      Order.aggregate([
        { $match: rangeMatchNotCancelled },
        { $unwind: '$items' },
        {
          $group: {
            _id: '$items.product',
            name: { $first: '$items.name' },
            image: { $first: '$items.image' },
            totalQty: { $sum: '$items.quantity' },
            totalRevenue: { $sum: { $multiply: ['$items.price', '$items.quantity'] } },
          },
        },
        { $sort: { totalQty: -1 } },
        { $limit: 5 },
      ]),

      // Order status breakdown for range
      Order.aggregate([
        { $match: { createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
        { $group: { _id: '$status', count: { $sum: 1 } } },
      ]),

      // Revenue by payment method
      Order.aggregate([
        { $match: rangeMatchNotCancelled },
        { $group: { _id: '$paymentMethod', total: { $sum: '$total' }, count: { $sum: 1 } } },
      ]),

      // Average order value
      Order.aggregate([
        { $match: rangeMatchNotCancelled },
        { $group: { _id: null, avg: { $avg: '$total' } } },
      ]),

      // Peak order hours
      Order.aggregate([
        { $match: { createdAt: { $gte: rangeStart, $lte: rangeEnd } } },
        { $group: { _id: { $hour: '$createdAt' }, count: { $sum: 1 } } },
        { $sort: { count: -1 } },
        { $limit: 5 },
      ]),
    ]);

    // Print order stats
    const PrintOrderModel = require('../models/PrintOrder');
    const [
      todayPrintOrders,
      todayPrintRevAgg,
      pendingPrintOrders,
      rangePrintOrders,
      rangePrintRevenueAgg,
    ] = await Promise.all([
      PrintOrderModel.countDocuments({ createdAt: { $gte: todayStart } }),
      PrintOrderModel.aggregate([
        { $match: { createdAt: { $gte: todayStart }, status: { $ne: 'cancelled' } } },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
      PrintOrderModel.countDocuments({ status: 'placed' }),
      PrintOrderModel.countDocuments(rangeMatch),
      PrintOrderModel.aggregate([
        { $match: rangeMatchNotCancelled },
        { $group: { _id: null, total: { $sum: '$total' } } },
      ]),
    ]);

    // Format status breakdown into an object
    const statusBreakdown = {};
    orderStatusBreakdown.forEach((s) => { statusBreakdown[s._id] = s.count; });

    // Format payment breakdown
    const paymentBreakdown = {};
    revenueByPayment.forEach((p) => {
      paymentBreakdown[p._id || 'unknown'] = { revenue: p.total, orders: p.count };
    });

    ApiResponse.success(res, {
      // Today (combined shop + print)
      todayOrders: todayOrders + todayPrintOrders,
      todayRevenue: (todayRevAgg[0]?.total || 0) + (todayPrintRevAgg[0]?.total || 0),
      pendingOrders: pendingOrders + pendingPrintOrders,
      // Today breakdown
      todayShopOrders: todayOrders,
      todayPrintOrders,
      // Inventory
      totalProducts,
      outOfStockProducts,
      // Users
      totalUsers,
      // Range stats (combined)
      range: { from: rangeStart, to: rangeEnd },
      rangeOrders: rangeOrders + rangePrintOrders,
      rangeRevenue: (rangeRevenueAgg[0]?.total || 0) + (rangePrintRevenueAgg[0]?.total || 0),
      rangeCancelledOrders,
      rangeDeliveredOrders,
      avgOrderValue: Math.round(avgOrderValueAgg[0]?.avg || 0),
      // Trends & breakdowns
      dailyTrend,
      topProducts,
      statusBreakdown,
      paymentBreakdown,
      peakHours: peakHoursAgg.map((h) => ({ hour: h._id, orders: h.count })),
      // Print-specific
      rangePrintOrders,
      rangePrintRevenue: rangePrintRevenueAgg[0]?.total || 0,
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/orders — list orders with filters
const getAdminOrders = async (req, res, next) => {
  try {
    const { status, date } = req.query;
    const parsedPage = Math.max(1, parseInt(req.query.page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(req.query.limit) || 20));
    const query = {};

    if (status) query.status = status;

    if (date === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: todayStart };
    }

    const skip = (parsedPage - 1) * parsedLimit;
    const total = await Order.countDocuments(query);

    const orders = await Order.find(query)
      .populate('user', 'name phone hostel')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit);

    ApiResponse.paginated(res, orders, {
      page: parsedPage,
      limit: parsedLimit,
      total,
      pages: Math.ceil(total / parsedLimit),
    });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/orders/:id — update order status
const updateOrderStatus = async (req, res, next) => {
  try {
    const { status, note } = req.body;
    const validStatuses = ['placed', 'confirmed', 'packed', 'out', 'gate', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw ApiError.badRequest('Invalid status');
    }

    const order = await Order.findById(req.params.id).populate('user', 'phone');
    if (!order) throw ApiError.notFound('Order not found');

    order.status = status;
    order.statusHistory.push({ status, note: note || `Status changed to ${status}` });

    // Auto-update payment status
    if (status === 'delivered' && order.paymentMethod === 'cod') {
      order.paymentStatus = 'paid';
    }
    if (status === 'cancelled' && order.paymentStatus === 'paid') {
      order.paymentStatus = 'refunded';
    }

    await order.save();

    // Emit real-time update to customer (both order-specific and user-specific rooms)
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      const updatePayload = {
        orderId: order.orderId,
        status: order.status,
        statusHistory: order.statusHistory,
      };
      // Emit to order-specific room (for order detail page)
      io.to(`order_${order.orderId}`).emit('order-update', updatePayload);
      // Emit to user-specific room (for global notifications on any page)
      io.to(`user_${order.user._id || order.user}`).emit('order-update', updatePayload);
    } catch (socketErr) {
      // Socket not initialized
    }

    // Send notification (async, don't block response)
    const { sendOrderNotification, orderStatusMessages } = require('../services/notificationService');
    if (orderStatusMessages[status] && order.user?.phone) {
      sendOrderNotification(order.user.phone, orderStatusMessages[status](order.orderId)).catch(console.error);
    }

    ApiResponse.success(res, { orderId: order.orderId, status: order.status }, `Order status updated to ${status}`);
  } catch (err) {
    next(err);
  }
};

// --- Product CRUD ---

// GET /api/admin/products
const getAdminProducts = async (req, res, next) => {
  try {
    const { search, category, page = 1, limit = 50 } = req.query;
    const query = {};

    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { tags: { $regex: escaped, $options: 'i' } },
      ];
    }
    if (category) query.category = category;

    const parsedPage = Math.max(1, parseInt(page) || 1);
    const parsedLimit = Math.min(100, Math.max(1, parseInt(limit) || 50));
    const skip = (parsedPage - 1) * parsedLimit;
    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate('category', 'name slug')
      .populate('subCategory', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit);

    ApiResponse.paginated(res, products, {
      page: parsedPage,
      limit: parsedLimit,
      total,
      pages: Math.ceil(total / parsedLimit),
    });
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/products
const createProduct = async (req, res, next) => {
  try {
    const { error } = productSchema.validate(req.body);
    if (error) throw ApiError.badRequest(error.details[0].message);

    // Handle tags as comma-separated string
    if (typeof req.body.tags === 'string') {
      req.body.tags = req.body.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    const product = await Product.create(req.body);
    await product.populate('category', 'name slug');

    ApiResponse.created(res, product, 'Product created');
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/products/:id
const updateProduct = async (req, res, next) => {
  try {
    // Allow partial updates — don't require all fields
    const { error } = productSchema.validate(req.body, { presence: 'optional' });
    if (error) throw ApiError.badRequest(error.details[0].message);

    if (typeof req.body.tags === 'string') {
      req.body.tags = req.body.tags.split(',').map((t) => t.trim()).filter(Boolean);
    }

    // Auto-sync: if stockQty is set to 0, mark as out of stock
    if (req.body.stockQty !== undefined && Number(req.body.stockQty) <= 0) {
      req.body.inStock = false;
      req.body.stockQty = 0;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('category', 'name slug');

    if (!product) throw ApiError.notFound('Product not found');

    // Emit real-time product update to both shop and admin rooms
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      const payload = {
        _id: product._id,
        name: product.name,
        inStock: product.inStock,
        stockQty: product.stockQty,
        price: product.price,
        mrp: product.mrp,
        isActive: product.isActive,
      };
      io.to('shop').emit('product-update', payload);
      io.to('admin').emit('product-update', payload);
    } catch (socketErr) {
      // Socket not initialized
    }

    ApiResponse.success(res, product, 'Product updated');
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/products/:id — partial update (stock toggle, etc.)
const patchProduct = async (req, res, next) => {
  try {
    const allowed = ['inStock', 'stockQty', 'price', 'mrp', 'isActive'];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }

    if (Object.keys(updates).length === 0) {
      throw ApiError.badRequest('No valid fields to update');
    }

    // Auto-sync: if stockQty is set to 0, mark as out of stock
    if (updates.stockQty !== undefined && Number(updates.stockQty) <= 0) {
      updates.inStock = false;
      updates.stockQty = 0;
    }

    const product = await Product.findByIdAndUpdate(req.params.id, updates, {
      new: true,
      runValidators: true,
    }).populate('category', 'name slug');

    if (!product) throw ApiError.notFound('Product not found');

    // Emit real-time product update to both shop and admin rooms
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      const payload = {
        _id: product._id,
        name: product.name,
        inStock: product.inStock,
        stockQty: product.stockQty,
        price: product.price,
        mrp: product.mrp,
        isActive: product.isActive,
      };
      io.to('shop').emit('product-update', payload);
      io.to('admin').emit('product-update', payload);
    } catch (socketErr) {
      // Socket not initialized
    }

    ApiResponse.success(res, product, 'Product updated');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/products/:id — soft delete
const deleteProduct = async (req, res, next) => {
  try {
    const product = await Product.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!product) throw ApiError.notFound('Product not found');

    ApiResponse.success(res, null, 'Product deleted');
  } catch (err) {
    next(err);
  }
};

// --- Category CRUD ---

// POST /api/admin/categories
const createCategory = async (req, res, next) => {
  try {
    const { error } = categorySchema.validate(req.body);
    if (error) throw ApiError.badRequest(error.details[0].message);

    const category = await Category.create(req.body);
    ApiResponse.created(res, category, 'Category created');
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/categories/:id
const updateCategory = async (req, res, next) => {
  try {
    const { error } = categorySchema.validate(req.body);
    if (error) throw ApiError.badRequest(error.details[0].message);

    const category = await Category.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    });
    if (!category) throw ApiError.notFound('Category not found');

    ApiResponse.success(res, category, 'Category updated');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/categories/:id
const deleteCategory = async (req, res, next) => {
  try {
    const category = await Category.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!category) throw ApiError.notFound('Category not found');

    ApiResponse.success(res, null, 'Category deleted');
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/products/upload-image — upload product image to Cloudinary
const uploadProductImage = async (req, res, next) => {
  try {
    if (!req.file) throw ApiError.badRequest('No image file provided');

    const cloudinary = require('../config/cloudinary');

    // Upload buffer to Cloudinary
    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'meddrop/products',
          transformation: [{ width: 600, height: 600, crop: 'fill', quality: 'auto' }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    ApiResponse.success(res, { url: result.secure_url }, 'Image uploaded');
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/categories/upload-image — upload category image to Cloudinary
const uploadCategoryImage = async (req, res, next) => {
  try {
    if (!req.file) throw ApiError.badRequest('No image file provided');

    const cloudinary = require('../config/cloudinary');

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'meddrop/categories',
          transformation: [{ width: 400, height: 400, crop: 'fill', quality: 'auto' }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    ApiResponse.success(res, { url: result.secure_url }, 'Category image uploaded');
  } catch (err) {
    next(err);
  }
};

// --- SubCategory CRUD ---
const SubCategory = require('../models/SubCategory');

// GET /api/admin/subcategories
const getAdminSubCategories = async (req, res, next) => {
  try {
    const { category } = req.query;
    const query = {};
    if (category) query.parentCategory = category;
    const subs = await SubCategory.find(query)
      .populate('parentCategory', 'name slug')
      .sort({ displayOrder: 1, name: 1 });
    ApiResponse.success(res, subs);
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/subcategories
const createSubCategory = async (req, res, next) => {
  try {
    const { name, parentCategory, icon, image, displayOrder } = req.body;
    if (!name || !parentCategory) throw ApiError.badRequest('Name and parentCategory are required');
    const sub = await SubCategory.create({ name, parentCategory, icon, image, displayOrder });
    await sub.populate('parentCategory', 'name slug');
    ApiResponse.created(res, sub, 'SubCategory created');
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/subcategories/:id
const updateSubCategory = async (req, res, next) => {
  try {
    const sub = await SubCategory.findByIdAndUpdate(req.params.id, req.body, {
      new: true,
      runValidators: true,
    }).populate('parentCategory', 'name slug');
    if (!sub) throw ApiError.notFound('SubCategory not found');
    ApiResponse.success(res, sub, 'SubCategory updated');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/subcategories/:id
const deleteSubCategory = async (req, res, next) => {
  try {
    const sub = await SubCategory.findByIdAndUpdate(req.params.id, { isActive: false }, { new: true });
    if (!sub) throw ApiError.notFound('SubCategory not found');
    ApiResponse.success(res, null, 'SubCategory deleted');
  } catch (err) {
    next(err);
  }
};

// === PRINT ORDER ADMIN ===

const PrintOrder = require('../models/PrintOrder');

// GET /api/admin/print-orders — list all print orders
const getAdminPrintOrders = async (req, res, next) => {
  try {
    const { status, date } = req.query;
    const query = {};
    if (status) query.status = status;
    if (date === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      query.createdAt = { $gte: todayStart };
    }

    const orders = await PrintOrder.find(query)
      .populate('user', 'name phone hostel')
      .sort({ createdAt: -1 })
      .limit(100);

    ApiResponse.success(res, orders);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/print-orders/:id — update print order status
const updatePrintOrderStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const validStatuses = ['placed', 'printing', 'ready', 'out', 'delivered', 'cancelled'];
    if (!validStatuses.includes(status)) {
      throw ApiError.badRequest('Invalid status');
    }

    const order = await PrintOrder.findById(req.params.id);
    if (!order) throw ApiError.notFound('Print order not found');

    order.status = status;
    await order.save();

    // Emit real-time update
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      io.to('admin').emit('order-update', { orderId: order.orderId, status, type: 'print' });
      // Notify the user's room if they're listening
      io.emit(`order-${order.orderId}`, { status, orderId: order.orderId });
    } catch (socketErr) {
      // Socket not initialized
    }

    ApiResponse.success(res, order, `Status updated to ${status}`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  adminLogin,
  getDashboard,
  getAdminOrders,
  updateOrderStatus,
  getAdminProducts,
  createProduct,
  updateProduct,
  patchProduct,
  deleteProduct,
  createCategory,
  updateCategory,
  deleteCategory,
  uploadProductImage,
  uploadCategoryImage,
  getAdminSubCategories,
  createSubCategory,
  updateSubCategory,
  deleteSubCategory,
  getAdminPrintOrders,
  updatePrintOrderStatus,
};
