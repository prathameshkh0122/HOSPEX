const router = require('express').Router();
const controller = require('../controllers/authController');
const { protect } = require('../middleware/auth');

router.post('/register', controller.register);
router.post('/login', controller.login);
router.post('/reset-password', controller.resetPassword);
router.get('/me', protect, controller.me);
module.exports = router;
