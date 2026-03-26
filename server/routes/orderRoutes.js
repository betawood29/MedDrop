// Order routes — protected endpoints for placing and viewing orders
const router = require('express').Router();
const { createOrder, getOrders, getOrder } = require('../controllers/orderController');
const protect = require('../middleware/auth');

router.use(protect); // All order routes require authentication

router.post('/', createOrder);
router.get('/', getOrders);
router.get('/:id', getOrder);

module.exports = router;
