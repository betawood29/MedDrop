// Product controller — public product listing with search, category filter, pagination
// Also serves category list for the shop page

const Product = require('../models/Product');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');

// GET /api/products — list products with optional filters
const getProducts = async (req, res, next) => {
  try {
    const { category, subCategory, search, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };

    // Filter by category slug
    if (category) {
      const cat = await Category.findOne({ slug: category, isActive: true });
      if (cat) {
        query.category = cat._id;
      } else {
        return ApiResponse.paginated(res, [], { page: 1, limit, total: 0, pages: 0 });
      }
    }

    // Filter by subcategory slug
    if (subCategory) {
      const sub = await SubCategory.findOne({ slug: subCategory, isActive: true });
      if (sub) {
        query.subCategory = sub._id;
      } else {
        return ApiResponse.paginated(res, [], { page: 1, limit, total: 0, pages: 0 });
      }
    }

    // Text search (escape regex special chars to prevent ReDoS)
    if (search) {
      const escaped = search.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      query.$or = [
        { name: { $regex: escaped, $options: 'i' } },
        { tags: { $regex: escaped, $options: 'i' } },
        { description: { $regex: escaped, $options: 'i' } },
      ];
    }

    const skip = (parseInt(page) - 1) * parseInt(limit);
    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate('category', 'name slug icon')
      .populate('subCategory', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parseInt(limit));

    ApiResponse.paginated(res, products, {
      page: parseInt(page),
      limit: parseInt(limit),
      total,
      pages: Math.ceil(total / parseInt(limit)),
    });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/:id — get single product
const getProduct = async (req, res, next) => {
  try {
    const product = await Product.findOne({ _id: req.params.id, isActive: true })
      .populate('category', 'name slug icon');

    if (!product) throw ApiError.notFound('Product not found');

    ApiResponse.success(res, product);
  } catch (err) {
    next(err);
  }
};

// GET /api/categories — list all active categories
const getCategories = async (req, res, next) => {
  try {
    const categories = await Category.find({ isActive: true }).sort({ displayOrder: 1, name: 1 });
    ApiResponse.success(res, categories);
  } catch (err) {
    next(err);
  }
};

// GET /api/subcategories?category=slug — list subcategories for a parent category
const getSubCategories = async (req, res, next) => {
  try {
    const { category } = req.query;
    const query = { isActive: true };

    if (category) {
      const cat = await Category.findOne({ slug: category, isActive: true });
      if (cat) {
        query.parentCategory = cat._id;
      } else {
        return ApiResponse.success(res, []);
      }
    }

    const subCategories = await SubCategory.find(query)
      .populate('parentCategory', 'name slug')
      .sort({ displayOrder: 1, name: 1 });

    ApiResponse.success(res, subCategories);
  } catch (err) {
    next(err);
  }
};

// GET /api/subcategories/:slug/products — products grouped by subcategory
const getSubCategoryProducts = async (req, res, next) => {
  try {
    const sub = await SubCategory.findOne({ slug: req.params.slug, isActive: true })
      .populate('parentCategory', 'name slug');
    if (!sub) throw ApiError.notFound('SubCategory not found');

    const products = await Product.find({ subCategory: sub._id, isActive: true })
      .populate('category', 'name slug icon')
      .populate('subCategory', 'name slug')
      .sort({ createdAt: -1 });

    ApiResponse.success(res, { subCategory: sub, products });
  } catch (err) {
    next(err);
  }
};

module.exports = { getProducts, getProduct, getCategories, getSubCategories, getSubCategoryProducts };
