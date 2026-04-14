const Feedback = require('../models/Feedback');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// POST /api/feedback — submit a suggestion / complaint / delivery review
const submitFeedback = async (req, res, next) => {
  try {
    const { type, message, name, phone, orderId, rating } = req.body;

    const isReview = type === 'delivery_review';

    // Reviews require a rating; all other types require a message
    if (isReview && (!rating || rating < 1 || rating > 5)) {
      throw ApiError.badRequest('A rating between 1 and 5 is required for delivery reviews');
    }
    if (!isReview && (!message || message.trim().length < 5)) {
      throw ApiError.badRequest('Message must be at least 5 characters');
    }

    // Prevent duplicate delivery reviews for the same order by the same user
    if (isReview && orderId && req.user?._id) {
      const existing = await Feedback.findOne({ user: req.user._id, orderId, type: 'delivery_review' });
      if (existing) {
        return ApiResponse.success(res, { id: existing._id }, 'Review already submitted');
      }
    }

    const feedback = await Feedback.create({
      user: req.user?._id || null,
      name: name || req.user?.name || null,
      phone: phone || req.user?.phone || null,
      type: type || 'general',
      orderId: orderId || null,
      rating: rating || null,
      message: message ? message.trim() : null,
    });

    ApiResponse.success(res, { id: feedback._id }, 'Thank you for your feedback!', 201);
  } catch (err) {
    next(err);
  }
};

// GET /api/feedback — admin: list all feedback (newest first)
const listFeedback = async (req, res, next) => {
  try {
    const { status, type, page = 1, limit = 50 } = req.query;
    const query = {};
    if (status) query.status = status;
    if (type) query.type = type;

    const skip = (Number(page) - 1) * Number(limit);
    const [items, total] = await Promise.all([
      Feedback.find(query).sort({ createdAt: -1 }).skip(skip).limit(Number(limit)),
      Feedback.countDocuments(query),
    ]);

    ApiResponse.success(res, { items, total, page: Number(page) });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/feedback/:id — admin: update status
const updateFeedbackStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    if (!['new', 'read', 'resolved'].includes(status)) {
      throw ApiError.badRequest('Invalid status');
    }
    const item = await Feedback.findByIdAndUpdate(req.params.id, { status }, { new: true });
    if (!item) throw ApiError.notFound('Feedback not found');
    ApiResponse.success(res, item);
  } catch (err) {
    next(err);
  }
};

module.exports = { submitFeedback, listFeedback, updateFeedbackStatus };
