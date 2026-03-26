// Auth controller — handles OTP send/verify, JWT generation, and profile completion
// Dev mode uses static OTP "123456", production uses Firebase Auth

const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { sendOTP, verifyOTP } = require('../services/otpService');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { phoneSchema, verifyOtpSchema, completeProfileSchema } = require('../utils/validators');

// Generate JWT token for a user
const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, {
    expiresIn: process.env.JWT_EXPIRE || '30d',
  });
};

// POST /api/auth/send-otp — send OTP to phone number
const sendOtp = async (req, res, next) => {
  try {
    const { error } = phoneSchema.validate(req.body);
    if (error) throw ApiError.badRequest(error.details[0].message);

    const { phone } = req.body;
    const result = await sendOTP(phone);

    ApiResponse.success(res, null, result.message);
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/verify-otp — verify OTP and return JWT
const verifyOtp = async (req, res, next) => {
  try {
    const { error } = verifyOtpSchema.validate(req.body);
    if (error) throw ApiError.badRequest(error.details[0].message);

    const { phone, otp, firebaseToken } = req.body;
    const verification = await verifyOTP(phone, otp, firebaseToken);

    // Find or create user
    let user = await User.findOne({ phone });
    let isNewUser = false;

    if (!user) {
      user = await User.create({
        phone,
        name: '', // Will be completed in profile step
        firebaseUid: verification.firebaseUid || null,
      });
      isNewUser = true;
    }

    // Check if admin phone
    if (phone === process.env.ADMIN_PHONE && user.role !== 'admin') {
      user.role = 'admin';
      await user.save();
    }

    const token = generateToken(user._id);

    ApiResponse.success(res, {
      token,
      user: {
        id: user._id,
        name: user.name,
        phone: user.phone,
        hostel: user.hostel,
        preferredGate: user.preferredGate,
        role: user.role,
      },
      isNewUser,
    }, 'Login successful');
  } catch (err) {
    next(err);
  }
};

// POST /api/auth/complete-profile — set name, hostel, gate after first login
const completeProfile = async (req, res, next) => {
  try {
    const { error } = completeProfileSchema.validate(req.body);
    if (error) throw ApiError.badRequest(error.details[0].message);

    const user = await User.findByIdAndUpdate(
      req.user._id,
      {
        name: req.body.name,
        hostel: req.body.hostel,
        preferredGate: req.body.preferredGate,
      },
      { new: true, runValidators: true }
    );

    ApiResponse.success(res, {
      id: user._id,
      name: user.name,
      phone: user.phone,
      hostel: user.hostel,
      preferredGate: user.preferredGate,
      role: user.role,
    }, 'Profile updated');
  } catch (err) {
    next(err);
  }
};

// GET /api/auth/me — get current logged-in user
const getMe = async (req, res, next) => {
  try {
    ApiResponse.success(res, {
      id: req.user._id,
      name: req.user.name,
      phone: req.user.phone,
      hostel: req.user.hostel,
      preferredGate: req.user.preferredGate,
      role: req.user.role,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = { sendOtp, verifyOtp, completeProfile, getMe };
