// Push notification subscription management

const User = require('../models/User');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// POST /api/notifications/subscribe — save push subscription for this device
const subscribe = async (req, res, next) => {
  try {
    const { subscription } = req.body;
    if (!subscription?.endpoint) throw ApiError.badRequest('Invalid subscription object');

    const user = await User.findById(req.user._id);

    // Replace existing entry for this endpoint (re-subscribe / key rotation)
    user.pushSubscriptions = user.pushSubscriptions.filter(
      (s) => s.endpoint !== subscription.endpoint
    );
    user.pushSubscriptions.push({
      endpoint: subscription.endpoint,
      keys: subscription.keys,
    });

    await user.save();
    ApiResponse.success(res, null, 'Subscribed to push notifications');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/notifications/subscribe — remove push subscription for this device
const unsubscribe = async (req, res, next) => {
  try {
    const { endpoint } = req.body;
    if (!endpoint) throw ApiError.badRequest('Endpoint required');

    await User.findByIdAndUpdate(req.user._id, {
      $pull: { pushSubscriptions: { endpoint } },
    });

    ApiResponse.success(res, null, 'Unsubscribed from push notifications');
  } catch (err) {
    next(err);
  }
};

// GET /api/notifications/vapid-public-key — expose public key to client
const getVapidPublicKey = (req, res) => {
  res.json({ success: true, data: process.env.VAPID_PUBLIC_KEY || '' });
};

module.exports = { subscribe, unsubscribe, getVapidPublicKey };
