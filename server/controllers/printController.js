// Print controller — handles print store orders (file upload, pricing, order creation)

const PrintOrder = require('../models/PrintOrder');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

const DELIVERY_FEE = 25;
const FREE_DELIVERY_MIN = 299;

// POST /api/print/order — create a print order
const createPrintOrder = async (req, res, next) => {
  try {
    if (!req.files || req.files.length === 0) {
      throw ApiError.badRequest('At least one file is required');
    }

    const { copies = 1, colorMode = 'bw', sides = 'single', paperSize = 'A4', totalPages, hostel, gate, note } = req.body;

    if (!totalPages || totalPages < 1) {
      throw ApiError.badRequest('Total pages is required');
    }
    if (!hostel || !gate) {
      throw ApiError.badRequest('Hostel and gate are required');
    }

    const files = req.files.map((f) => ({
      originalName: f.originalname,
      url: `/uploads/${f.filename}`,
      size: f.size,
    }));

    const printOrder = new PrintOrder({
      user: req.user._id,
      files,
      config: {
        copies: Math.min(Math.max(parseInt(copies) || 1, 1), 50),
        colorMode,
        sides,
        paperSize,
      },
      totalPages: parseInt(totalPages),
      hostel,
      gate,
      note,
    });

    // Pricing is calculated in the pre-save hook
    // Override delivery fee based on subtotal
    await printOrder.save();

    if (printOrder.subtotal >= FREE_DELIVERY_MIN) {
      printOrder.deliveryFee = 0;
      printOrder.total = printOrder.subtotal;
      await printOrder.save();
    }

    ApiResponse.created(res, {
      orderId: printOrder.orderId,
      totalPages: printOrder.totalPages,
      pricePerPage: printOrder.pricePerPage,
      subtotal: printOrder.subtotal,
      deliveryFee: printOrder.deliveryFee,
      total: printOrder.total,
      status: printOrder.status,
    }, 'Print order placed successfully!');
  } catch (err) {
    next(err);
  }
};

// GET /api/print/orders — list user's print orders
const getPrintOrders = async (req, res, next) => {
  try {
    const orders = await PrintOrder.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-__v');

    ApiResponse.success(res, orders);
  } catch (err) {
    next(err);
  }
};

// GET /api/print/orders/:id — get single print order
const getPrintOrder = async (req, res, next) => {
  try {
    const order = await PrintOrder.findOne({
      $or: [
        { _id: req.params.id },
        { orderId: req.params.id.toUpperCase() },
      ],
      user: req.user._id,
    });

    if (!order) throw ApiError.notFound('Print order not found');
    ApiResponse.success(res, order);
  } catch (err) {
    next(err);
  }
};

// GET /api/print/pricing — get print pricing info
const getPricing = async (req, res, next) => {
  try {
    ApiResponse.success(res, {
      bw: { single: 2, double: 1.5, label: 'Black & White' },
      color: { single: 5, double: 3.75, label: 'Color' },
      deliveryFee: DELIVERY_FEE,
      freeDeliveryMin: FREE_DELIVERY_MIN,
      paperSizes: ['A4', 'A3', 'Letter'],
      maxCopies: 50,
      maxFileSize: '20MB',
      allowedFormats: ['PDF', 'DOC', 'DOCX', 'JPG', 'PNG', 'PPT', 'PPTX'],
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { createPrintOrder, getPrintOrders, getPrintOrder, getPricing };
