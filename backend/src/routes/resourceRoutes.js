const router = require('express').Router();
const controller = require('../controllers/resourceController');
const { protect } = require('../middleware/auth');
const { resourceImageUpload } = require('../utils/upload');

router.get('/', controller.list);
router.get('/mine', protect, controller.mine);
router.post('/', protect, resourceImageUpload, controller.create);
router.get('/:id', controller.getOne);
router.delete('/:id', protect, controller.remove);
module.exports = router;
