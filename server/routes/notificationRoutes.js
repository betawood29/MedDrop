const router = require('express').Router();
const { subscribe, unsubscribe, getVapidPublicKey } = require('../controllers/notificationController');
const protect = require('../middleware/auth');

router.get('/vapid-public-key', getVapidPublicKey); // public
router.post('/subscribe', protect, subscribe);
router.delete('/subscribe', protect, unsubscribe);

module.exports = router;
