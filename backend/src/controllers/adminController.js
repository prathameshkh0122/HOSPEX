const jwt = require('jsonwebtoken');
const User = require('../models/User');
const Business = require('../models/Business');
const Notification = require('../models/Notification');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

function createToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw httpError(400, 'Email and password are required.');
  const user = await User.findOne({ email: String(email).toLowerCase().trim(), role: 'admin' }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw httpError(401, 'Invalid admin credentials.');
  res.json({ success: true, message: 'Admin logged in successfully.', data: { user, token: createToken(user) } });
});

exports.listBusinesses = asyncHandler(async (req, res) => {
  const { status } = req.query;
  const filter = {};
  if (status && ['pending', 'verified', 'rejected'].includes(status)) filter.verificationStatus = status;
  const businesses = await Business.find(filter).populate('user', 'email businessName').sort({ submittedAt: -1 }).lean();
  res.json({ success: true, data: { businesses } });
});

exports.verify = asyncHandler(async (req, res) => {
  const business = await Business.findById(req.params.id);
  if (!business) throw httpError(404, 'Business application not found.');
  business.verificationStatus = 'verified';
  business.rejectionReason = '';
  business.verifiedAt = new Date();
  await business.save();
  await Notification.create({
    user: business.user,
    title: 'Business verified',
    message: 'Your business has been verified. You can now list your resources.'
  });
  res.json({ success: true, message: 'Business verified.', data: { business } });
});

exports.reject = asyncHandler(async (req, res) => {
  const { reason } = req.body;
  if (!reason || !String(reason).trim()) throw httpError(400, 'A rejection reason is required.');
  const business = await Business.findById(req.params.id);
  if (!business) throw httpError(404, 'Business application not found.');
  business.verificationStatus = 'rejected';
  business.rejectionReason = String(reason).trim();
  business.verifiedAt = null;
  await business.save();
  await Notification.create({
    user: business.user,
    title: 'Business application rejected',
    message: `Your business application was rejected. Reason: ${business.rejectionReason}`
  });
  res.json({ success: true, message: 'Business rejected.', data: { business } });
});
