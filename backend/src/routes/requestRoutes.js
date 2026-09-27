const router = require('express').Router();
const controller = require('../controllers/requestController');
const { protect } = require('../middleware/auth');
const { paymentScreenshotUpload } = require('../utils/upload');

router.use(protect);
router.get('/mine', controller.mine);
router.get('/received', controller.received);
router.post('/', controller.create);
router.patch('/:id/status', controller.updateStatus);
router.post('/:id/payment', paymentScreenshotUpload, controller.submitPayment);
router.patch('/:id/payment-status', controller.verifyPayment);
router.post('/:id/rating', controller.rate);
module.exports = router;
