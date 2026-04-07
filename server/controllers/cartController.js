// Cart controller — server-side cart persistence for cross-device sync
// GET /api/cart — load user's saved cart
// PUT /api/cart — save/replace user's cart

const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// GET /api/cart — return user's cart with populated product details
const getCart = async (req, res, next) => {
  try {
    const user = await User.findById(req.user._id)
      .populate('cart.product', 'name price image inStock stockQty isActive category')
      .lean();

    // Strip out products that were deleted or deactivated
    const validItems = (user.cart || []).filter(
      (item) => item.product && item.product.isActive
    );

    ApiResponse.success(res, validItems);
  } catch (err) {
    next(err);
  }
};

// PUT /api/cart — replace entire cart (client is source of truth on writes)
const saveCart = async (req, res, next) => {
  try {
    const { items } = req.body;
    if (!Array.isArray(items)) throw ApiError.badRequest('Items must be an array');

    const cartItems = items
      .filter((i) => i.product && i.quantity > 0)
      .map((i) => ({ product: i.product, quantity: Number(i.quantity) }));

    await User.findByIdAndUpdate(req.user._id, { cart: cartItems });

    // Broadcast to all other sessions of this user (other devices/tabs)
    try {
      const { getIO } = require('../config/socket');
      getIO().to(`user_${req.user._id}`).emit('cart-update', cartItems);
    } catch {
      // Socket not initialized
    }

    ApiResponse.success(res, cartItems, 'Cart saved');
  } catch (err) {
    next(err);
  }
};

module.exports = { getCart, saveCart };
