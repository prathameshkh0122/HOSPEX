const router = require('express').Router();
const controller = require('../controllers/chatController');
const { protect } = require('../middleware/auth');
const { chatImageUpload } = require('../utils/upload');

router.use(protect);
router.get('/mine', controller.mine);
router.get('/:id/messages', controller.messages);
router.post('/:id/messages', chatImageUpload, controller.send);
module.exports = router;
