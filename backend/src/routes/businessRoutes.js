const router = require('express').Router();
const controller = require('../controllers/businessController');
const { protect } = require('../middleware/auth');
const { handleBusinessUploads } = require('../utils/upload');

router.get('/mine', protect, controller.mine);
router.get('/:userId', protect, controller.publicProfile);
router.post('/register', protect, handleBusinessUploads, controller.register);
module.exports = router;
