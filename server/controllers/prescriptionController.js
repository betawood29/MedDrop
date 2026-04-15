// Prescription controller
// User:  upload, list, delete
// Admin: list, review (approve/reject/clarify/partial), attach medicines, update delivery

const cloudinary = require('../config/cloudinary');
const Prescription = require('../models/Prescription');
const Product      = require('../models/Product');
const ApiResponse  = require('../utils/apiResponse');
const ApiError     = require('../utils/apiError');

const EXPIRY_DAYS = 90;   // prescriptions valid for 90 days after approval

// ─── helpers ────────────────────────────────────────────────────────────────

const emitToUser = (userId, event, data) => {
  try { require('../config/socket').getIO().to(`user_${userId}`).emit(event, data); } catch (_) {}
};
const emitToAdmin = (event, data) => {
  try { require('../config/socket').getIO().to('admin').emit(event, data); } catch (_) {}
};

// ─── USER ────────────────────────────────────────────────────────────────────

// POST /api/prescriptions
const uploadPrescription = async (req, res, next) => {
  try {
    if (!req.file) throw ApiError.badRequest('Please upload a prescription image or PDF');

    const { note } = req.body;
    const isImage = req.file.mimetype.startsWith('image/');
    const fileType = isImage ? 'image' : 'pdf';

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

    emitToAdmin('new-prescription', {
      prescriptionId: prescription.prescriptionId,
      userName: req.user.name || req.user.phone,
    });

    ApiResponse.created(res, prescription, 'Prescription uploaded! Our pharmacist will review it shortly.');
  } catch (err) {
    next(err);
  }
};

// GET /api/prescriptions
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

// GET /api/prescriptions/:id
const getPrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findOne({ _id: req.params.id, user: req.user._id }).lean();
    if (!prescription) throw ApiError.notFound('Prescription not found');
    ApiResponse.success(res, prescription);
  } catch (err) {
    next(err);
  }
};

// DELETE /api/prescriptions/:id  (only pending)
const deletePrescription = async (req, res, next) => {
  try {
    const prescription = await Prescription.findOne({ _id: req.params.id, user: req.user._id });
    if (!prescription) throw ApiError.notFound('Prescription not found');
    if (prescription.status !== 'pending') {
      throw ApiError.badRequest('Only pending prescriptions can be deleted');
    }
    if (prescription.filePublicId) {
      try {
        await cloudinary.uploader.destroy(prescription.filePublicId, {
          resource_type: prescription.fileType === 'image' ? 'image' : 'raw',
        });
      } catch (_) {}
    }
    await prescription.deleteOne();
    ApiResponse.success(res, null, 'Prescription deleted');
  } catch (err) {
    next(err);
  }
};

// POST /api/prescriptions/:id/request-delivery  (legacy — kept for backward compat)
const requestDelivery = async (req, res, next) => {
  try {
    const { hostel, gate, note } = req.body;
    if (!hostel || !gate) throw ApiError.badRequest('Hostel and gate are required');

    const prescription = await Prescription.findOne({ _id: req.params.id, user: req.user._id });
    if (!prescription) throw ApiError.notFound('Prescription not found');
    if (!['approved', 'partially_approved'].includes(prescription.status)) {
      throw ApiError.badRequest('Only approved prescriptions can request delivery');
    }
    if (prescription.order) throw ApiError.badRequest('This prescription is already linked to an order');
    if (prescription.deliveryRequest?.hostel) {
      throw ApiError.badRequest('Delivery has already been requested for this prescription');
    }

    prescription.deliveryRequest = { hostel, gate, note: note || '', status: 'requested', requestedAt: new Date() };
    await prescription.save();

    emitToAdmin('new-prescription', {
      type: 'delivery',
      prescriptionId: prescription.prescriptionId,
      userName: req.user.name || req.user.phone,
    });

    ApiResponse.success(res, prescription, 'Delivery requested!');
  } catch (err) {
    next(err);
  }
};

// ─── ADMIN ────────────────────────────────────────────────────────────────────

// GET /api/admin/prescriptions
const getAdminPrescriptions = async (req, res, next) => {
  try {
    const { status, date, page = 1, limit = 20 } = req.query;
    const filter = {};
    if (status) filter.status = status;
    if (date === 'today') {
      const s = new Date(); s.setHours(0, 0, 0, 0);
      filter.createdAt = { $gte: s };
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

// PATCH /api/admin/prescriptions/:id
// Body: { status, adminNote, clarificationMessage, approvedMedicines, rejectedMedicines, isReusable, maxUsage }
const reviewPrescription = async (req, res, next) => {
  try {
    const {
      status, adminNote,
      clarificationMessage,
      approvedMedicines, rejectedMedicines,
      isReusable, maxUsage,
    } = req.body;

    const valid = ['approved', 'rejected', 'clarification_required', 'partially_approved'];
    if (!valid.includes(status)) {
      throw ApiError.badRequest(`Status must be one of: ${valid.join(', ')}`);
    }
    if (status === 'clarification_required' && !clarificationMessage?.trim()) {
      throw ApiError.badRequest('clarificationMessage is required when requesting clarification');
    }

    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) throw ApiError.notFound('Prescription not found');

    // Allow re-review only from pending or clarification_required
    if (!['pending', 'clarification_required'].includes(prescription.status)) {
      throw ApiError.badRequest('Prescription has already been finalized');
    }

    prescription.status       = status;
    prescription.adminNote    = adminNote || '';
    prescription.reviewedAt   = new Date();
    prescription.reviewedBy   = req.admin?._id;

    if (status === 'clarification_required') {
      prescription.clarificationMessage = clarificationMessage.trim();
    } else {
      prescription.clarificationMessage = undefined;
    }

    if (status === 'approved' || status === 'partially_approved') {
      // Attach medicines if provided
      if (Array.isArray(approvedMedicines) && approvedMedicines.length) {
        prescription.approvedMedicines = approvedMedicines;
      }
      if (Array.isArray(rejectedMedicines) && rejectedMedicines.length) {
        prescription.rejectedMedicines = rejectedMedicines;
      }
      prescription.isReusable = Boolean(isReusable);
      prescription.maxUsage   = (isReusable && maxUsage > 1) ? parseInt(maxUsage) : 1;
      prescription.expiresAt  = new Date(Date.now() + EXPIRY_DAYS * 24 * 60 * 60 * 1000);
    }

    await prescription.save();

    // Notify user via socket
    emitToUser(prescription.user, 'prescription-update', {
      prescriptionId: prescription.prescriptionId,
      status,
      adminNote: adminNote || '',
      clarificationMessage: prescription.clarificationMessage || '',
      approvedMedicines: prescription.approvedMedicines || [],
    });

    ApiResponse.success(res, prescription, `Prescription ${status}`);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/prescriptions/:id/medicines
// Admin can update the attached medicine list independently (without re-reviewing)
const attachMedicines = async (req, res, next) => {
  try {
    const { approvedMedicines, rejectedMedicines } = req.body;

    const prescription = await Prescription.findById(req.params.id);
    if (!prescription) throw ApiError.notFound('Prescription not found');
    if (!['approved', 'partially_approved'].includes(prescription.status)) {
      throw ApiError.badRequest('Can only attach medicines to approved prescriptions');
    }

    if (Array.isArray(approvedMedicines)) prescription.approvedMedicines = approvedMedicines;
    if (Array.isArray(rejectedMedicines)) prescription.rejectedMedicines = rejectedMedicines;
    await prescription.save();

    // Notify user so they can re-fill cart
    emitToUser(prescription.user, 'prescription-update', {
      prescriptionId: prescription.prescriptionId,
      status: prescription.status,
      approvedMedicines: prescription.approvedMedicines,
    });

    ApiResponse.success(res, prescription, 'Medicine list updated');
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/prescriptions/products/search?q=...
// Admin searches products to attach to a prescription
const searchProducts = async (req, res, next) => {
  try {
    const { q } = req.query;
    if (!q || q.trim().length < 2) {
      return ApiResponse.success(res, []);
    }
    const escaped = q.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const products = await Product.find({
      isActive: true,
      inStock: true,
      requiresPrescription: true,
      $or: [
        { name: { $regex: escaped, $options: 'i' } },
        { tags: { $regex: escaped, $options: 'i' } },
      ],
    })
      .select('name price image stockQty')
      .limit(15)
      .lean();
    ApiResponse.success(res, products);
  } catch (err) {
    next(err);
  }
};

// PATCH /api/admin/prescriptions/:id/delivery — legacy delivery status
const updateDeliveryStatus = async (req, res, next) => {
  try {
    const { status } = req.body;
    const allowed = ['preparing', 'out', 'delivered'];
    if (!allowed.includes(status)) throw ApiError.badRequest('Invalid delivery status');

    const prescription = await Prescription.findById(req.params.id).populate('user', '_id name phone');
    if (!prescription) throw ApiError.notFound('Prescription not found');
    if (!prescription.deliveryRequest?.hostel) {
      throw ApiError.badRequest('No delivery request found');
    }

    prescription.deliveryRequest.status = status;
    await prescription.save();

    const labels = { preparing: 'Medicines being prepared', out: 'Out for delivery', delivered: 'Delivered' };
    emitToUser(prescription.user._id, 'prescription-update', {
      prescriptionId: prescription.prescriptionId,
      status: 'delivery_' + status,
      adminNote: labels[status],
    });

    ApiResponse.success(res, prescription, `Delivery status updated to ${status}`);
  } catch (err) {
    next(err);
  }
};

module.exports = {
  uploadPrescription,
  getMyPrescriptions,
  getPrescription,
  deletePrescription,
  requestDelivery,
  getAdminPrescriptions,
  reviewPrescription,
  attachMedicines,
  searchProducts,
  updateDeliveryStatus,
};
