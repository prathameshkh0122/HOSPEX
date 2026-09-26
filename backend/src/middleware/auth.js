const jwt = require('jsonwebtoken');
const User = require('../models/User');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

const protect = asyncHandler(async (req, _res, next) => {
  const authorization = req.headers.authorization || '';
  if (!authorization.startsWith('Bearer ')) throw httpError(401, 'Please log in to continue.');
  let payload;
  try { payload = jwt.verify(authorization.slice(7), process.env.JWT_SECRET); }
  catch { throw httpError(401, 'Your session is invalid or has expired. Please log in again.'); }
  const user = await User.findById(payload.sub);
  if (!user) throw httpError(401, 'Account not found. Please log in again.');
  req.user = user;
  next();
});

module.exports = { protect };
