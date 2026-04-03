// Banner routes — public active banner endpoint

const router = require('express').Router();
const { getActiveBanner } = require('../controllers/bannerController');

// Public — fetch active banner for homepage
router.get('/active', getActiveBanner);

module.exports = router;
