// Recommendation routes — buy-again (personal), frequently-bought-together & suggested (public)
const router = require('express').Router();
const protect = require('../middleware/auth');
const {
  getBuyAgainProducts,
  getFrequentlyBoughtTogether,
  getSuggestedProducts,
} = require('../controllers/recommendationController');

router.get('/buy-again', protect, getBuyAgainProducts);
router.get('/frequently-bought-together/:productId', getFrequentlyBoughtTogether);
router.get('/suggested', getSuggestedProducts);

module.exports = router;
