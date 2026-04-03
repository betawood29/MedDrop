// Banner controller — CRUD for hero banner content

const Banner = require('../models/Banner');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// GET /api/banner/active — get the currently active banner (public)
const getActiveBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findOne({ isActive: true }).sort({ updatedAt: -1 }).lean();
    ApiResponse.success(res, banner);
  } catch (err) {
    next(err);
  }
};

// GET /api/admin/banner — get all banners (admin)
const getBanners = async (req, res, next) => {
  try {
    const banners = await Banner.find().sort({ updatedAt: -1 }).lean();
    ApiResponse.success(res, banners);
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/banner — create a new banner (admin)
const createBanner = async (req, res, next) => {
  try {
    const { title, highlight, subtitle, image, link, features, isActive } = req.body;
    if (!title || !highlight) throw ApiError.badRequest('Title and highlight are required');

    // If setting active, deactivate others
    if (isActive) {
      await Banner.updateMany({}, { isActive: false });
    }

    const banner = await Banner.create({
      title, highlight, subtitle, image, link,
      features: features || [],
      isActive: isActive !== false,
    });

    ApiResponse.created(res, banner, 'Banner created');
  } catch (err) {
    next(err);
  }
};

// PUT /api/admin/banner/:id — update a banner (admin)
const updateBanner = async (req, res, next) => {
  try {
    const { title, highlight, subtitle, image, link, features, isActive } = req.body;

    const banner = await Banner.findById(req.params.id);
    if (!banner) throw ApiError.notFound('Banner not found');

    // If setting active, deactivate others
    if (isActive && !banner.isActive) {
      await Banner.updateMany({ _id: { $ne: banner._id } }, { isActive: false });
    }

    Object.assign(banner, {
      ...(title !== undefined && { title }),
      ...(highlight !== undefined && { highlight }),
      ...(subtitle !== undefined && { subtitle }),
      ...(image !== undefined && { image }),
      ...(link !== undefined && { link }),
      ...(features !== undefined && { features }),
      ...(isActive !== undefined && { isActive }),
    });

    await banner.save();
    ApiResponse.success(res, banner, 'Banner updated');
  } catch (err) {
    next(err);
  }
};

// DELETE /api/admin/banner/:id — delete a banner (admin)
const deleteBanner = async (req, res, next) => {
  try {
    const banner = await Banner.findByIdAndDelete(req.params.id);
    if (!banner) throw ApiError.notFound('Banner not found');
    ApiResponse.success(res, null, 'Banner deleted');
  } catch (err) {
    next(err);
  }
};

// POST /api/admin/banner/upload-image — upload banner image to Cloudinary
const uploadBannerImage = async (req, res, next) => {
  try {
    if (!req.file) throw ApiError.badRequest('No image file provided');

    const cloudinary = require('../config/cloudinary');

    const result = await new Promise((resolve, reject) => {
      const stream = cloudinary.uploader.upload_stream(
        {
          folder: 'meddrop/banners',
          transformation: [{ width: 1200, height: 500, crop: 'fill', quality: 'auto' }],
        },
        (error, result) => {
          if (error) reject(error);
          else resolve(result);
        }
      );
      stream.end(req.file.buffer);
    });

    ApiResponse.success(res, { url: result.secure_url }, 'Banner image uploaded');
  } catch (err) {
    next(err);
  }
};

module.exports = { getActiveBanner, getBanners, createBanner, updateBanner, deleteBanner, uploadBannerImage };
