// Product controller — public product listing with search, category filter, pagination
// Also serves category list for the shop page

const Product = require('../models/Product');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const SearchTerm = require('../models/SearchTerm');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { scoreProduct, seededShuffle, todaySeed, diversifyBySubCategory } = require('../utils/trending');

// GET /api/products — list products with optional filters
const getProducts = async (req, res, next) => {
  try {
    const { category, subCategory, search, page = 1, limit = 20 } = req.query;
    const query = { isActive: true };
    let singleCategoryId = null;

    // Filter by category slug
    if (category) {
      const cat = await Category.findOne({ slug: category, isActive: true });
      if (cat) {
        query.category = cat._id;
        singleCategoryId = cat._id;
      } else {
        return ApiResponse.paginated(res, [], { page: 1, limit, total: 0, pages: 0 });
      }
    } else {
      // No specific category filter — restrict to products whose category is active
      const activeCategories = await Category.find({ isActive: true }).select('_id').lean();
      query.category = { $in: activeCategories.map((c) => c._id) };
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

    const parsedPage = parseInt(page);
    const parsedLimit = parseInt(limit);
    const skip = (parsedPage - 1) * parsedLimit;

    // Browsing a single category with no subcategory/search filter (e.g. the "All" tab
    // within a category that has multiple subcategories) — round-robin across subcategories
    // instead of a flat createdAt sort, so the listing isn't stacked in subcategory-sized
    // blocks by upload batch (LIFO). Each subcategory keeps its own newest-first order.
    if (singleCategoryId && !subCategory && !search) {
      const idRows = await Product.find(query).select('_id subCategory createdAt').sort({ createdAt: -1 }).lean();
      const orderedIds = diversifyBySubCategory(idRows, () => 0).map((r) => r._id);

      const total = orderedIds.length;
      const pageIds = orderedIds.slice(skip, skip + parsedLimit);
      const docs = await Product.find({ _id: { $in: pageIds } })
        .populate('category', 'name slug icon')
        .populate('subCategory', 'name slug');
      const byId = new Map(docs.map((d) => [d._id.toString(), d]));
      const products = pageIds.map((id) => byId.get(id.toString())).filter(Boolean);

      return ApiResponse.paginated(res, products, {
        page: parsedPage,
        limit: parsedLimit,
        total,
        pages: Math.ceil(total / parsedLimit),
      });
    }

    const total = await Product.countDocuments(query);

    const products = await Product.find(query)
      .populate('category', 'name slug icon')
      .populate('subCategory', 'name slug')
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(parsedLimit);

    ApiResponse.paginated(res, products, {
      page: parsedPage,
      limit: parsedLimit,
      total,
      pages: Math.ceil(total / parsedLimit),
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

    // Fire-and-forget view tracking — never block or fail the response
    Product.updateOne({ _id: product._id }, { $inc: { viewCount: 1 } }).catch(() => {});

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
        // Match either the primary parentCategory or the optional additionalCategories list
        query.$or = [{ parentCategory: cat._id }, { additionalCategories: cat._id }];
      } else {
        return ApiResponse.success(res, []);
      }
    }

    const subCategories = await SubCategory.find(query)
      .populate('parentCategory', 'name slug')
      .populate('additionalCategories', 'name slug')
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
      .populate('parentCategory', 'name slug')
      .populate('additionalCategories', 'name slug');
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

    // Fire-and-forget search term tracking — powers "popular searches"
    if (query.length >= 2) {
      SearchTerm.updateOne(
        { term: query.toLowerCase() },
        { $inc: { count: 1 }, $set: { lastSearchedAt: new Date() } },
        { upsert: true }
      ).catch(() => {});
    }

    // Only return products from active categories
    const activeCategories = await Category.find({ isActive: true }).select('_id').lean();
    const activeCategoryIds = activeCategories.map((c) => c._id);

    // Strategy 1: $text search (uses index, ranked by relevance)
    let products = [];
    try {
      products = await Product.find(
        { $text: { $search: query }, isActive: true, category: { $in: activeCategoryIds } },
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
        category: { $in: activeCategoryIds },
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
// Ranked by a popularity score (orders + views + recency boost), then daily-shuffled
// within the top pool so the order feels fresh without jumping around on every reload.
const getTrendingByCategory = async (req, res, next) => {
  try {
    const { limit = 8 } = req.query;
    const parsedLimit = Math.min(20, Math.max(1, parseInt(limit) || 8));
    const seed = todaySeed();

    // Get all active categories
    const categories = await Category.find({ isActive: true })
      .sort({ displayOrder: 1, name: 1 })
      .lean();

    const sections = await Promise.all(
      categories.map(async (cat) => {
        const products = await Product.find({
          category: cat._id,
          isActive: true,
        })
          .populate('category', 'name slug icon')
          .populate('subCategory', 'name slug')
          .lean();

        const inStock = products.filter((p) => p.inStock);
        const outOfStock = products.filter((p) => !p.inStock).sort((a, b) => scoreProduct(b) - scoreProduct(a));

        // Round-robin across subcategories (each internally ranked by score) before taking
        // the top pool — otherwise a single bulk-uploaded subcategory (highest recency boost)
        // can crowd out the category's other subcategories entirely.
        const diversePool = diversifyBySubCategory(inStock, scoreProduct);

        // Shuffle within the top scoring pool (wider than the limit) for daily variety
        const pool = seededShuffle(diversePool.slice(0, parsedLimit * 2), seed + cat._id).slice(0, parsedLimit);
        const topProducts = pool.length < parsedLimit
          ? [...pool, ...outOfStock].slice(0, parsedLimit)
          : pool;

        return {
          category: cat,
          products: topProducts,
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

// GET /api/products/trending/all — a single mixed "Trending Products" feed for the homepage
// Round-robins across categories so no single category dominates, ranked by popularity score.
const getTrendingProducts = async (req, res, next) => {
  try {
    const { limit = 12 } = req.query;
    const parsedLimit = Math.min(30, Math.max(1, parseInt(limit) || 12));
    const seed = todaySeed();

    const categories = await Category.find({ isActive: true }).select('_id').lean();

    // Top candidates per category (in-stock only, ranked by score)
    const perCategory = await Promise.all(
      categories.map(async (cat) => {
        const products = await Product.find({ category: cat._id, isActive: true, inStock: true })
          .populate('category', 'name slug icon')
          .populate('subCategory', 'name slug')
          .lean();
        return diversifyBySubCategory(products, scoreProduct).slice(0, parsedLimit);
      })
    );

    // Round-robin interleave: one product per category per round
    const mixed = [];
    for (let i = 0; mixed.length < parsedLimit && perCategory.some((c) => c[i]); i++) {
      for (const categoryProducts of perCategory) {
        if (categoryProducts[i]) mixed.push(categoryProducts[i]);
        if (mixed.length >= parsedLimit) break;
      }
    }

    ApiResponse.success(res, seededShuffle(mixed, seed).slice(0, parsedLimit));
  } catch (err) {
    next(err);
  }
};

// GET /api/search/popular — top search terms, powers "popular searches" chips
const getPopularSearches = async (req, res, next) => {
  try {
    const { limit = 8 } = req.query;
    const parsedLimit = Math.min(20, Math.max(1, parseInt(limit) || 8));
    const terms = await SearchTerm.find().sort({ count: -1 }).limit(parsedLimit).select('term -_id').lean();
    ApiResponse.success(res, terms.map((t) => t.term));
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getProducts,
  getProduct,
  getCategories,
  getSubCategories,
  getSubCategoryProducts,
  searchProducts,
  getTrendingByCategory,
  getTrendingProducts,
  getPopularSearches,
};
