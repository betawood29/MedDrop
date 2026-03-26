// Admin role check middleware
// Accepts either:
//   1. Admin model token (separate admin login with isAdmin flag)
//   2. User model token where user has role "admin"

const jwt = require('jsonwebtoken');
const Admin = require('../models/Admin');
const User = require('../models/User');
const ApiError = require('../utils/apiError');

const adminAuth = async (req, res, next) => {
  try {
    let token;

    if (req.headers.authorization && req.headers.authorization.startsWith('Bearer')) {
      token = req.headers.authorization.split(' ')[1];
    }

    if (!token) {
      throw ApiError.unauthorized('Admin access required');
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Path 1: Admin model token (has isAdmin flag from admin login)
    if (decoded.isAdmin) {
      const admin = await Admin.findById(decoded.id);
      if (!admin || !admin.isActive) {
        throw ApiError.forbidden('Admin account not found or disabled');
      }
      req.admin = admin;
      return next();
    }

    // Path 2: Regular user token — check if user has admin role
    const user = await User.findById(decoded.id);
    if (user && user.role === 'admin' && !user.isBlocked) {
      req.admin = user;
      return next();
    }

    throw ApiError.forbidden('Admin access only');
  } catch (error) {
    if (error.name === 'JsonWebTokenError') {
      return next(ApiError.unauthorized('Invalid admin token'));
    }
    next(error);
  }
};

module.exports = adminAuth;
