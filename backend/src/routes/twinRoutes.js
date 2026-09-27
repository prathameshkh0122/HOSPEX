const router = require('express').Router();
const controller = require('../controllers/twinController');

router.get('/weather', controller.weather);
router.get('/social-signals', controller.socialSignals);

module.exports = router;
