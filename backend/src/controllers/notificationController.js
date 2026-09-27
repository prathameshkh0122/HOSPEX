const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

exports.mine = asyncHandler(async (req, res) => {
  const notifications = await Notification.find({ user: req.user._id }).sort({ createdAt: -1 }).limit(50).lean();
  const unreadCount = notifications.filter((item) => !item.read).length;
  res.json({ success: true, data: { notifications, unreadCount } });
});

exports.markRead = asyncHandler(async (req, res) => {
  const notification = await Notification.findOne({ _id: req.params.id, user: req.user._id });
  if (!notification) throw httpError(404, 'Notification not found.');
  notification.read = true;
  await notification.save();
  res.json({ success: true, data: { notification } });
});

exports.markAllRead = asyncHandler(async (req, res) => {
  await Notification.updateMany({ user: req.user._id, read: false }, { $set: { read: true } });
  res.json({ success: true, message: 'All notifications marked as read.' });
});
