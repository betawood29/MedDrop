// Cart routes — protected, requires login
const router = require('express').Router();
const { getCart, saveCart } = require('../controllers/cartController');
const protect = require('../middleware/auth');

router.use(protect);
router.get('/', getCart);
router.put('/', saveCart);

module.exports = router;
