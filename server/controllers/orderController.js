// Order controller — create order, list user's orders, get order details
// Calculates delivery fee: ₹25 flat, FREE above ₹199

const Order = require('../models/Order');
const Product = require('../models/Product');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { createOrderSchema } = require('../utils/validators');

const DELIVERY_FEE = 25;
const FREE_DELIVERY_MIN = 199;

// POST /api/orders — place a new order
const createOrder = async (req, res, next) => {
  try {
    const { error } = createOrderSchema.validate(req.body);
    if (error) throw ApiError.badRequest(error.details[0].message);

    const { items, hostel, gate, note, paymentMethod } = req.body;

    // Fetch product details and build order items with price snapshots
    const orderItems = [];
    let subtotal = 0;

    const productsToUpdate = [];

    for (const item of items) {
      const product = await Product.findById(item.product);
      if (!product) throw ApiError.badRequest(`Product not found: ${item.product}`);
      if (!product.isActive || !product.inStock) {
        throw ApiError.badRequest(`${product.name} is currently unavailable`);
      }
      if (product.stockQty > 0 && product.stockQty < item.quantity) {
        throw ApiError.badRequest(`Only ${product.stockQty} units of ${product.name} available`);
      }

      const itemTotal = product.price * item.quantity;
      subtotal += itemTotal;

      orderItems.push({
        product: product._id,
        name: product.name,
        price: product.price,
        quantity: item.quantity,
        image: product.image,
      });

      productsToUpdate.push({ product, quantity: item.quantity });
    }

    // Deduct stock after all validations pass
    for (const { product, quantity } of productsToUpdate) {
      if (product.stockQty > 0) {
        product.stockQty -= quantity;
        if (product.stockQty <= 0) {
          product.stockQty = 0;
          product.inStock = false;
        }
        await product.save();

        // Emit real-time stock update to shop AND admin
        try {
          const { getIO } = require('../config/socket');
          const io = getIO();
          const payload = {
            _id: product._id,
            name: product.name,
            inStock: product.inStock,
            stockQty: product.stockQty,
          };
          io.to('shop').emit('product-update', payload);
          io.to('admin').emit('product-update', payload);
        } catch (socketErr) {
          // Socket not initialized
        }
      }
    }

    // Calculate delivery fee
    const deliveryFee = subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
    const total = subtotal + deliveryFee;

    const order = await Order.create({
      user: req.user._id,
      items: orderItems,
      subtotal,
      deliveryFee,
      total,
      hostel,
      gate,
      note,
      paymentMethod,
      paymentStatus: paymentMethod === 'cod' ? 'pending' : 'pending',
    });

    // Emit to admin room for live feed
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      io.to('admin').emit('new-order', {
        orderId: order.orderId,
        total: order.total,
        items: order.items.length,
        gate: order.gate,
      });
    } catch (socketErr) {
      // Socket not initialized — ignore in dev
    }

    ApiResponse.created(res, {
      orderId: order.orderId,
      total: order.total,
      deliveryFee: order.deliveryFee,
      status: order.status,
    }, 'Order placed! Gate pe aake pick kar lena 😊');
  } catch (err) {
    next(err);
  }
};

// GET /api/orders — list current user's orders
const getOrders = async (req, res, next) => {
  try {
    const orders = await Order.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .select('-__v');

    ApiResponse.success(res, orders);
  } catch (err) {
    next(err);
  }
};

// GET /api/orders/:id — get order details by orderId (e.g., "MD000001") or MongoDB _id
const getOrder = async (req, res, next) => {
  try {
    const id = req.params.id;
    const mongoose = require('mongoose');

    // Build query: try _id only if it's a valid ObjectId, always try orderId
    const conditions = [{ orderId: id.toUpperCase() }];
    if (mongoose.Types.ObjectId.isValid(id)) {
      conditions.push({ _id: id });
    }

    const order = await Order.findOne({
      $or: conditions,
      user: req.user._id,
    }).populate('items.product', 'name image');

    if (!order) throw ApiError.notFound('Order not found');

    ApiResponse.success(res, order);
  } catch (err) {
    next(err);
  }
};

module.exports = { createOrder, getOrders, getOrder };
