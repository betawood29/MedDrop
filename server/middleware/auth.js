// JWT verification middleware
// Extracts token from Authorization header, verifies it, and attaches user to req

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const ApiError = require('../utils/apiError');

const protect = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw ApiError.unauthorized('Please login to continue');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const user = await User.findById(decoded.id);

    if (!user) {
      throw ApiError.unauthorized('User not found');
    }

    if (user.isBlocked) {
      throw ApiError.forbidden('Your account has been blocked. Contact support.');
    }

    req.user = user;
    next();
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(ApiError.unauthorized('Invalid token'));
    }
    if (error.name === 'TokenExpiredError') {
      return next(ApiError.unauthorized('Token expired, please login again'));
    }
    next(error);
  }
};

module.exports = protect;
