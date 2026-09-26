const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

function createToken(user) {
  return jwt.sign({ sub: user.id }, process.env.JWT_SECRET, { expiresIn: process.env.JWT_EXPIRES_IN || '7d' });
}

exports.register = asyncHandler(async (req, res) => {
  const { businessName, businessType, email, password } = req.body;
  if (!businessName || !businessType || !email || !password) throw httpError(400, 'Business name, type, email and password are required.');
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw httpError(400, 'Please enter a valid email address.');
  if (password.length < 8) throw httpError(400, 'Password must be at least 8 characters long.');
  const user = await User.create({ businessName, businessType, email, password });
  res.status(201).json({ success: true, message: 'Account created successfully.', data: { user, token: createToken(user) } });
});

exports.login = asyncHandler(async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) throw httpError(400, 'Email and password are required.');
  const user = await User.findOne({ email: String(email).toLowerCase().trim() }).select('+password');
  if (!user || !(await user.comparePassword(password))) throw httpError(401, 'Email or password is incorrect.');
  res.json({ success: true, message: 'Logged in successfully.', data: { user, token: createToken(user) } });
});

exports.me = asyncHandler(async (req, res) => {
  res.json({ success: true, data: { user: req.user } });
});
