const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

exports.mine = asyncHandler(async (req, res) => {
  const [notifications, unreadCount] = await Promise.all([
    Notification.find({ user: req.user._id, read: false }).sort({ createdAt: -1 }).limit(50).lean(),
    Notification.countDocuments({ user: req.user._id, read: false })
  ]);
  res.json({ success: true, data: { notifications, unreadCount } });
});

exports.markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOneAndDelete({ _id: req.params.id, user: req.user._id });
  if (!notification) throw httpError(404, 'Notification not found.');
  const unreadCount = await Notification.countDocuments({ user: req.user._id, read: false });
  res.json({ success: true, message: 'Notification dismissed.', data: { notification, unreadCount } });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.deleteMany({ user: req.user._id });
  res.json({ success: true, message: 'All notifications cleared.', data: { unreadCount: 0 } });
});
