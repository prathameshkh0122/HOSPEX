const Resource = require('../models/Resource');
const User = require('../models/User');
const ExchangeRequest = require('../models/ExchangeRequest');
const asyncHandler = require('../utils/asyncHandler');

exports.getStats = asyncHandler(async (_req, res) => {
  const [resources, businesses, completedRequests] = await Promise.all([
    Resource.countDocuments(), User.countDocuments(), ExchangeRequest.countDocuments({ status: 'completed' })
  ]);
  res.json({ success: true, data: { resources, businesses, completedRequests } });
});
