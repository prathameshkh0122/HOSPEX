const router = require('express').Router();
const controller = require('../controllers/resourceController');
const { protect } = require('../middleware/auth');

router.get('/', controller.list);
router.get('/mine', protect, controller.mine);
router.post('/', protect, controller.create);
router.delete('/:id', protect, controller.remove);
module.exports = router;
