// Order controller — create order, list user's orders, get order details
// Calculates delivery fee: ₹25 flat, FREE above ₹199

const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { createOrderSchema } = require('../utils/validators');

const DELIVERY_FEE = 25;
const FREE_DELIVERY_MIN = 199;

// POST /api/orders — place a new order
// This endpoint has no payment gateway involved, so it only accepts Cash on Delivery.
// Paid (UPI/card) orders MUST go through /api/payments/initiate + /api/payments/verify,
// which actually verify a Razorpay charge before creating the order.
const createOrder = async (req, res, next) => {
  try {
    const { error } = createOrderSchema.validate(req.body);
    if (error) throw ApiError.badRequest(error.details[0].message);

    const { items, hostel, gate, note, paymentMethod } = req.body;

    if (paymentMethod !== 'cod') {
      throw ApiError.badRequest('Online payments must be placed via the checkout payment flow');
    }

    // Validation, stock reservation, and order creation all run in one transaction so a
    // failure partway through (unavailable item, lost stock race, order save error)
    // rolls everything back instead of leaving stock decremented with no order.
    const session = await mongoose.startSession();
    let order, socketUpdates;

    try {
      await session.withTransaction(async () => {
        socketUpdates = [];
        const orderItems = [];
        const productDocs = [];
        let subtotal = 0;

        for (const item of items) {
          const product = await Product.findById(item.product).session(session);
          if (!product) throw ApiError.badRequest(`Product not found: ${item.product}`);
          if (!product.isActive || !product.inStock) {
            throw ApiError.badRequest(`${product.name} is currently unavailable`);
          }
          if (product.stockQty > 0 && product.stockQty < item.quantity) {
            throw ApiError.badRequest(`Only ${product.stockQty} units of ${product.name} available`);
          }

          subtotal += product.price * item.quantity;

          orderItems.push({
            product: product._id,
            name: product.name,
            price: product.price,
            quantity: item.quantity,
            image: product.image,
            stockDeducted: product.stockQty > 0,
          });

          productDocs.push({ product, quantity: item.quantity });
        }

        // Atomically reserve stock — findOneAndUpdate's filter re-checks stockQty at
        // write time, so two concurrent orders for the last unit can't both succeed.
        for (const { product, quantity } of productDocs) {
          if (product.stockQty > 0) {
            const updated = await Product.findOneAndUpdate(
              { _id: product._id, stockQty: { $gte: quantity } },
              { $inc: { stockQty: -quantity }, $set: { lastOrderedAt: new Date() } },
              { new: true, session }
            );
            if (!updated) {
              throw ApiError.badRequest(`Only a few units of ${product.name} are left — please update your cart and try again`);
            }
            if (updated.stockQty <= 0 && updated.inStock) {
              await Product.updateOne({ _id: updated._id }, { inStock: false }, { session });
              updated.inStock = false;
            }
            socketUpdates.push({ _id: updated._id, name: updated.name, inStock: updated.inStock, stockQty: updated.stockQty });
          }
        }

        const deliveryFee = subtotal >= FREE_DELIVERY_MIN ? 0 : DELIVERY_FEE;
        const total = subtotal + deliveryFee;

        const created = await Order.create([{
          user: req.user._id,
          items: orderItems,
          subtotal,
          deliveryFee,
          total,
          hostel,
          gate,
          note,
          paymentMethod,
          paymentStatus: 'pending',
        }], { session });
        order = created[0];
      });
    } finally {
      session.endSession();
    }

    // Post-commit side effects — fire-and-forget, never block the response
    try {
      const { getIO } = require('../config/socket');
      const io = getIO();
      socketUpdates.forEach((payload) => {
        io.to('shop').emit('product-update', payload);
        io.to('admin').emit('product-update', payload);
      });
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
