const router = require('express').Router();
const { submitFeedback, listFeedback, updateFeedbackStatus } = require('../controllers/feedbackController');
const protect = require('../middleware/auth');
const adminAuth = require('../middleware/admin');

// Logged-in users — submit feedback
router.post('/', protect, submitFeedback);

// Admin — view and manage
router.get('/', adminAuth, listFeedback);
router.patch('/:id', adminAuth, updateFeedbackStatus);

module.exports = router;
