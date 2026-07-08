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

module.exports = { scoreProduct, seededShuffle, todaySeed };
