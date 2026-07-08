// Trending helpers — popularity scoring + deterministic daily shuffle
//
// scoreProduct: blends real signals (orders, views) with a recency boost so
// brand-new products aren't buried under older ones with more accumulated views/orders.
//
// seededShuffle: shuffles an array deterministically based on a seed string (e.g. today's
// date), so the homepage feels fresh once a day without reshuffling on every request/reload.

const MS_PER_DAY = 1000 * 60 * 60 * 24;

const scoreProduct = (p) => {
  const daysSinceCreated = (Date.now() - new Date(p.createdAt).getTime()) / MS_PER_DAY;
  const recencyBoost = Math.max(0, 10 - daysSinceCreated);
  return (p.orderCount || 0) * 3 + (p.viewCount || 0) * 1 + recencyBoost;
};

// Simple string hash → 32-bit int, used to seed the PRNG
const hashSeed = (str) => {
  let h = 0;
  for (let i = 0; i < str.length; i++) {
    h = (Math.imul(31, h) + str.charCodeAt(i)) | 0;
  }
  return h >>> 0;
};

// mulberry32 — small, fast, deterministic PRNG
const mulberry32 = (seed) => {
  let a = seed;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
};

const seededShuffle = (array, seedString) => {
  const rand = mulberry32(hashSeed(seedString));
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(rand() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

// Today's date as YYYY-MM-DD, used as the default shuffle seed
const todaySeed = () => new Date().toISOString().slice(0, 10);

// Round-robins products across their subCategory, each internally ranked by scoreFn,
// so a single bulk-uploaded batch (e.g. all "Ketchup" added in one go, which would
// otherwise dominate the top of a plain score sort) doesn't crowd out the category's
// other subcategories before a downstream shuffle/slice picks from the result.
const diversifyBySubCategory = (products, scoreFn) => {
  const groups = new Map();
  for (const p of products) {
    const sub = p.subCategory;
    const key = sub ? (sub._id || sub).toString() : 'none';
    if (!groups.has(key)) groups.set(key, []);
    groups.get(key).push(p);
  }
  const buckets = Array.from(groups.values()).map((g) => g.sort((a, b) => scoreFn(b) - scoreFn(a)));
  const result = [];
  for (let i = 0; buckets.some((b) => b[i]); i++) {
    for (const bucket of buckets) {
      if (bucket[i]) result.push(bucket[i]);
    }
  }
  return result;
};

module.exports = { scoreProduct, seededShuffle, todaySeed, diversifyBySubCategory };
