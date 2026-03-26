// Product routes — public endpoints for browsing products and categories
const router = require('express').Router();
const { getProducts, getProduct, getCategories } = require('../controllers/productController');

router.get('/', getProducts);
router.get('/:id', getProduct);

module.exports = router;
