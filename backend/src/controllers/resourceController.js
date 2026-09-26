const Resource = require('../models/Resource');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

exports.list = asyncHandler(async (req, res) => {
  const { search, category, distance, page = 1, limit = 24 } = req.query;
  const filter = { status: 'available' };
  if (category && category !== 'all') filter.category = category;
  if (distance && distance !== 'all' && Number.isFinite(Number(distance))) filter.distance = { $lte: Number(distance) };
  if (search) filter.$text = { $search: String(search).slice(0, 100) };
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 24));
  const [resources, total] = await Promise.all([
    Resource.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
    Resource.countDocuments(filter)
  ]);
  res.json({ success: true, data: { resources, pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) } } });
});

exports.create = asyncHandler(async (req, res) => {
  const { name, category, quantity, condition, exchangeType, description = '' } = req.body;
  if (!name || !category || quantity === undefined || !condition || !exchangeType) throw httpError(400, 'Name, category, quantity, condition and exchange type are required.');
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw httpError(400, 'Quantity must be a positive whole number.');
  const resource = await Resource.create({ name, category, quantity, condition, exchangeType, description,
    owner: req.user._id, ownerName: req.user.businessName, verified: false });
  res.status(201).json({ success: true, message: 'Resource listed successfully.', data: { resource } });
});

exports.mine = asyncHandler(async (req, res) => {
  const resources = await Resource.find({ owner: req.user._id }).sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: { resources } });
});

exports.remove = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource) throw httpError(404, 'Resource not found.');
  if (!resource.owner || !resource.owner.equals(req.user._id)) throw httpError(403, 'You can only remove resources listed by your business.');
  await resource.deleteOne();
  res.json({ success: true, message: 'Resource removed successfully.' });
});
