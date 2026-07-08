// Recommendation controller — buy-again, frequently-bought-together, time-of-day suggestions
// All derived from real signals: Order history for co-purchase, popularity score for ranking/backfill.

const mongoose = require('mongoose');
const Order = require('../models/Order');
const Product = require('../models/Product');
const Category = require('../models/Category');
const SubCategory = require('../models/SubCategory');
const ApiResponse = require('../utils/apiResponse');
const ApiError = require('../utils/apiError');
const { scoreProduct, seededShuffle, todaySeed } = require('../utils/trending');
const TIME_BANDS = require('../config/timeBands');

// Case-insensitive exact-name match, e.g. 'Dairy and Breakfast' → /^Dairy and Breakfast$/i
const nameMatchers = (names) =>
  names.map((n) => new RegExp(`^${n.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}$`, 'i'));

// GET /api/recommendations/buy-again — products this user has ordered before, most recent first
const getBuyAgainProducts = async (req, res, next) => {
  try {
    const results = await Order.aggregate([
      { $match: { user: req.user._id, status: { $ne: 'cancelled' } } },
      { $unwind: '$items' },
      { $group: { _id: '$items.product', lastOrderedAt: { $max: '$createdAt' } } },
      { $sort: { lastOrderedAt: -1 } },
      { $limit: 12 },
    ]);

    const productIds = results.map((r) => r._id);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true, inStock: true })
      .populate('category', 'name slug icon')
      .lean();

    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    const ordered = productIds.map((id) => productMap.get(id.toString())).filter(Boolean);

    ApiResponse.success(res, ordered);
  } catch (err) {
    next(err);
  }
};

// GET /api/recommendations/frequently-bought-together/:productId
const getFrequentlyBoughtTogether = async (req, res, next) => {
  try {
    const { productId } = req.params;
    if (!mongoose.isValidObjectId(productId)) throw ApiError.badRequest('Invalid product id');
    const objectId = new mongoose.Types.ObjectId(productId);

    const results = await Order.aggregate([
      { $match: { 'items.product': objectId } },
      { $unwind: '$items' },
      { $match: { 'items.product': { $ne: objectId } } },
      { $group: { _id: '$items.product', count: { $sum: 1 } } },
      { $sort: { count: -1 } },
      { $limit: 6 },
    ]);

    const productIds = results.map((r) => r._id);
    const products = await Product.find({ _id: { $in: productIds }, isActive: true, inStock: true })
      .populate('category', 'name slug icon')
      .lean();
    const productMap = new Map(products.map((p) => [p._id.toString(), p]));
    let ordered = productIds.map((id) => productMap.get(id.toString())).filter(Boolean);

    // Cold-start backfill: pad with same-category trending when co-purchase data is sparse
    if (ordered.length < 3) {
      const source = await Product.findById(objectId).select('category').lean();
      if (source?.category) {
        const excludeIds = [objectId, ...ordered.map((p) => p._id)];
        const candidates = await Product.find({
          category: source.category,
          isActive: true,
          inStock: true,
          _id: { $nin: excludeIds },
        }).populate('category', 'name slug icon').lean();
        const filler = candidates.sort((a, b) => scoreProduct(b) - scoreProduct(a)).slice(0, 6 - ordered.length);
        ordered = [...ordered, ...filler];
      }
    }

    ApiResponse.success(res, ordered);
  } catch (err) {
    next(err);
  }
};

// GET /api/recommendations/suggested — time-of-day contextual picks (breakfast/refreshments/snacks/essentials)
// Eligibility is real category/subCategory membership (not free-text keyword search), so the
// section only ever shows genuinely relevant products; priorityKeywords just bias ranking within that pool.
const getSuggestedProducts = async (req, res, next) => {
  try {
    const hour = new Date().getHours();
    const band = TIME_BANDS.find(({ hours: [start, end] }) =>
      start < end ? hour >= start && hour < end : hour >= start || hour < end
    ) || TIME_BANDS[0];

    const [categories, subCategories] = await Promise.all([
      band.categories.length
        ? Category.find({ name: { $in: nameMatchers(band.categories) }, isActive: true }).select('_id').lean()
        : [],
      band.subCategories.length
        ? SubCategory.find({ name: { $in: nameMatchers(band.subCategories) }, isActive: true }).select('_id').lean()
        : [],
    ]);
    const categoryIds = categories.map((c) => c._id);
    const subCategoryIds = subCategories.map((s) => s._id);

    const matches = await Product.find({
      isActive: true,
      inStock: true,
      $or: [
        ...(categoryIds.length ? [{ category: { $in: categoryIds } }] : []),
        ...(subCategoryIds.length ? [{ subCategory: { $in: subCategoryIds } }] : []),
      ],
    }).populate('category', 'name slug icon').populate('subCategory', 'name slug').lean();

    const priorityPattern = band.priorityKeywords.length
      ? new RegExp(band.priorityKeywords.map((k) => k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')).join('|'), 'i')
      : null;
    const rank = (p) => {
      const isPriority = priorityPattern && (priorityPattern.test(p.name) || (p.tags || []).some((t) => priorityPattern.test(t)));
      return scoreProduct(p) + (isPriority ? 8 : 0);
    };

    // Bucket by category so one category (e.g. chocolates) can't crowd out the others in the
    // band — round-robin pull the best of each, then shuffle the mixed set for daily variety.
    const buckets = new Map();
    matches.forEach((p) => {
      const key = p.category?._id?.toString() || 'uncategorized';
      if (!buckets.has(key)) buckets.set(key, []);
      buckets.get(key).push(p);
    });
    const rankedBuckets = [...buckets.values()].map((group) => group.sort((a, b) => rank(b) - rank(a)));

    const mixed = [];
    for (let i = 0; mixed.length < 12 && rankedBuckets.some((g) => g[i]); i++) {
      for (const group of rankedBuckets) {
        if (group[i]) mixed.push(group[i]);
        if (mixed.length >= 12) break;
      }
    }

    let products = seededShuffle(mixed, todaySeed() + band.key);

    // Backfill with general trending on the rare chance a band has too few matching products
    if (products.length < 4) {
      const excludeIds = products.map((p) => p._id);
      const fallback = await Product.find({ isActive: true, inStock: true, _id: { $nin: excludeIds } })
        .populate('category', 'name slug icon').lean();
      const filler = fallback.sort((a, b) => scoreProduct(b) - scoreProduct(a)).slice(0, 10 - products.length);
      products = [...products, ...filler];
    }

    ApiResponse.success(res, { band: band.key, label: band.label, products });
  } catch (err) {
    next(err);
  }
};

module.exports = { getBuyAgainProducts, getFrequentlyBoughtTogether, getSuggestedProducts };
