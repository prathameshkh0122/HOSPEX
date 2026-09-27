const router = require('express').Router();
const controller = require('../controllers/notificationController');
const { protect } = require('../middleware/auth');

router.get('/mine', protect, controller.mine);
router.post('/:id/read', protect, controller.markRead);
router.post('/read-all', protect, controller.markAllRead);
module.exports = router;
