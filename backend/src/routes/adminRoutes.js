const router = require('express').Router();
const controller = require('../controllers/adminController');
const { protect, requireAdmin } = require('../middleware/auth');

router.post('/login', controller.login);
router.get('/businesses', protect, requireAdmin, controller.listBusinesses);
router.post('/businesses/:id/verify', protect, requireAdmin, controller.verify);
router.post('/businesses/:id/reject', protect, requireAdmin, controller.reject);
module.exports = router;
