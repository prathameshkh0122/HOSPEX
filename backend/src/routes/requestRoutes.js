const router = require('express').Router();
const controller = require('../controllers/requestController');
const { protect } = require('../middleware/auth');

router.use(protect);
router.get('/mine', controller.mine);
router.get('/received', controller.received);
router.post('/', controller.create);
router.patch('/:id/status', controller.updateStatus);
module.exports = router;
