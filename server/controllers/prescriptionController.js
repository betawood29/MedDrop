// Prescription controller — user upload + admin review
// User: upload prescription, list own prescriptions
// Admin: list all prescriptions, approve/reject

const cloudinary = require('../config/cloudinary');
const Prescription = require('../models/Prescription');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// POST /api/prescriptions — user uploads a prescription
const uploadPrescription = async (req, res, next) => {
  try {
    if (!req.file) throw ApiError.badRequest('Please upload a prescription image or PDF');

    const { note } = req.body;

    // Determine file type
    const isImage = req.file.mimetype.startsWith('image/');
    const isPdf = req.file.mimetype === 'application/pdf';
    const fileType = isImage ? 'image' : isPdf ? 'pdf' : 'other';

    // Upload to Cloudinary
    const uploadOptions = {
      folder: 'meddrop/prescriptions',
      resource_type: isImage ? 'image' : 'raw',
      public_id: `rx_${req.user._id}_${Date.now()}`,
    };

    let cloudinaryResult;
    await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(uploadOptions, (err, result) => {
        if (err) return reject(err);
        cloudinaryResult = result;
        resolve(result);
      });
      stream.end(req.file.buffer);
    });

    const prescription = await Prescription.create({
      user: req.user._id,
      fileUrl: cloudinaryResult.secure_url,
      filePublicId: cloudinaryResult.public_id,
      fileName: req.file.originalname,
      fileType,
      note: note || '',
      status: 'pending',
    });

    // Emit socket event to admin room
    const { getIO } = require('../config/socket');
    try {
      getIO().to('admin').emit('new-prescription', {
        prescriptionId: prescription.prescriptionId,
        userName: req.user.name || req.user.phone,
      });
    } catch (_) {}

    ApiResponse.created(res, prescription, 'Prescription uploaded successfully. Our pharmacist will review it shortly.');
  } catch (err) {
    next(err);
  }
};

// GET /api/prescriptions — get current user's prescriptions
const getMyPrescriptions = async (req, res, next) => {
  try {
    const prescriptions = await Prescription.find({ user: req.user._id })
      .sort({ createdAt: -1 })
      .lean();
    ApiResponse.success(res, prescriptions);
  } catch (err) {
    next(err);
  }
};

// GET /api/prescriptions/:id — get a single prescription (user's own)
const getPrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findOne({
      _id: req.params.id,
      user: req.user._id,
    }).lean();
    if (!prescription) throw ApiError.notFound('Prescription not found');
    ApiResponse.success(res, prescription);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/prescriptions/:id — user can delete a pending prescription
const deletePrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findOne({
      _id: req.params.id,
      user: req.user._id,
    });
    if (!prescription) throw ApiError.notFound('Prescription not found');
    if (prescription.status !== 'pending') {
      throw ApiError.badRequest('Only pending prescriptions can be deleted');
    }

    // Delete from Cloudinary
    if (prescription.filePublicId) {
      try {
        const resourceType = prescription.fileType === 'image' ? 'image' : 'raw';
        await cloudinary.uploader.destroy(prescription.filePublicId, { resource_type: resourceType });
      } catch (_) {}
    }

    await prescription.deleteOne();
    ApiResponse.success(res, null, 'Prescription deleted');
  } catch (err) {
    next(err);
  }
};

// ===================== ADMIN =====================

// GET /api/admin/prescriptions — list all prescriptions with filters
const getAdminPrescriptions = async (req, res, next) => {
  try {
    const { status, date, page = 1, limit = 20 } = req.query;
    const filter = {};

    if (status) filter.status = status;

    if (date === 'today') {
      const todayStart = new Date();
      todayStart.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: todayStart };
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const [prescriptions, total] = await Promise.all([
      Prescription.find(filter)
        .populate('user', 'name phone hostel')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit))
        .lean(),
      Prescription.countDocuments(filter),
    ]);

    ApiResponse.success(res, { prescriptions, total, page: parseInt(page), limit: parseInt(limit) });
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/prescriptions/:id — approve or reject a prescription
const reviewPrescription = async (req, res, next) => {
  try {
    const { status, adminNote } = req.body;
    if (!['approved', 'rejected'].includes(status)) {
      throw ApiError.badRequest('Status must be approved or rejected');
    }

    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) throw ApiError.notFound('Prescription not found');
    if (prescription.status !== 'pending') {
      throw ApiError.badRequest('Prescription has already been reviewed');
    }

    prescription.status = status;
    prescription.adminNote = adminNote || '';
    prescription.reviewedAt = new Date();
    await prescription.save();

    // Emit socket event to user
    const { getIO } = require('../config/socket');
    try {
      getIO().to(`user_${prescription.user}`).emit('prescription-update', {
        prescriptionId: prescription.prescriptionId,
        status,
        adminNote: adminNote || '',
      });
    } catch (_) {}

    ApiResponse.success(res, prescription, `Prescription ${status}`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadPrescription,
  getMyPrescriptions,
  getPrescription,
  deletePrescription,
  getAdminPrescriptions,
  reviewPrescription,
};
