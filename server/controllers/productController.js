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

// GET /api/search?q=query&limit=20 — optimized universal search
// Uses MongoDB $text index for relevance scoring, falls back to regex for partial matches
const searchProducts = async (req, res, next) => {
  try {
    const { q, limit = 20 } = req.query;
    if (!q || !q.trim()) {
      return ApiResponse.success(res, { products: [], suggestions: [] });
    }

    const query = q.trim();
    const parsedLimit = Math.min(50, Math.max(1, parseInt(limit) || 20));

    // Strategy 1: $text search (uses index, ranked by relevance)
    let products = [];
    try {
      products = await Product.find(
        { $text: { $search: query }, isActive: true },
        { score: { $meta: 'textScore' } }
      )
        .populate('category', 'name slug icon image')
        .populate('subCategory', 'name slug')
        .sort({ score: { $meta: 'textScore' } })
        .limit(parsedLimit)
        .lean();
    } catch {
      // $text index may not exist yet — skip
    }

    // Strategy 2: regex fallback for partial/prefix matches (if $text returned few results)
    if (products.length < parsedLimit) {
      const escaped = query.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      const existingIds = products.map((p) => p._id);
      const regexResults = await Product.find({
        _id: { $nin: existingIds },
        isActive: true,
        $or: [
          { name: { $regex: escaped, $options: 'i' } },
          { tags: { $regex: escaped, $options: 'i' } },
          { description: { $regex: escaped, $options: 'i' } },
        ],
      })
        .populate('category', 'name slug icon image')
        .populate('subCategory', 'name slug')
        .sort({ inStock: -1, createdAt: -1 })
        .limit(parsedLimit - products.length)
        .lean();

      products = [...products, ...regexResults];
    }

    // In-stock products first
    products.sort((a, b) => {
      if (a.inStock !== b.inStock) return a.inStock ? -1 : 1;
      return 0;
    });

    // Build category-grouped suggestions for quick navigation
    const categoryMap = new Map();
    products.forEach((p) => {
      if (p.category) {
        const key = p.category._id.toString();
        if (!categoryMap.has(key)) {
          categoryMap.set(key, { ...p.category, count: 0 });
        }
        categoryMap.get(key).count++;
      }
    });
    const suggestions = Array.from(categoryMap.values())
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);

    ApiResponse.success(res, { products, suggestions, total: products.length });
  } catch (err) {
    next(err);
  }
};

// GET /api/products/trending — products grouped by category for homepage sections
const getTrendingByCategory = async (req, res, next) => {
  try {
    const { limit = 8 } = req.query;
    const parsedLimit = Math.min(20, Math.max(1, parseInt(limit) || 8));

    // Get all active categories
    const categories = await Category.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    // For each category, fetch top products (in-stock first, then by createdAt)
    const sections = await Promise.all(
      categories.map(async (cat) => {
        const products = await Product.find({
          category: cat._id,
          isActive: true,
        })
          .populate('category', 'name slug icon')
          .populate('subCategory', 'name slug')
          .sort({ inStock: -1, createdAt: -1 })
          .limit(parsedLimit)
          .lean();

        return {
          category: cat,
          products,
        };
      })
    );

    // Filter out categories with no products
    const filtered = sections.filter((s) => s.products.length > 0);

    ApiResponse.success(res, filtered);
  } catch (err) {
    next(err);
  }
};

module.exports = { getProducts, getProduct, getCategories, getSubCategories, getSubCategoryProducts, searchProducts, getTrendingByCategory };
