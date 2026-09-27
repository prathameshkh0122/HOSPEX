const Resource = require('../models/Resource');
const Business = require('../models/Business');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

exports.list = asyncHandler(async (req, res) => {
  const { search, category, distance, page = 1, limit = 24 } = req.query;
  const filter = { status: 'available' };
  if (category && category !== 'all') filter.category = category;
  if (distance && distance !== 'all' && Number.isFinite(Number(distance))) filter.distance = { $lte: Number(distance) };
  if (search) {
    const escaped = String(search).slice(0, 100).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const pattern = new RegExp(escaped, 'i');
    filter.$or = [{ name: pattern }, { description: pattern }, { ownerName: pattern }, { location: pattern }];
  }
  const safePage = Math.max(1, parseInt(page, 10) || 1);
  const safeLimit = Math.min(100, Math.max(1, parseInt(limit, 10) || 24));
  const [resources, total] = await Promise.all([
    Resource.find(filter).sort({ createdAt: -1 }).skip((safePage - 1) * safeLimit).limit(safeLimit).lean(),
    Resource.countDocuments(filter)
  ]);
  res.json({ success: true, data: { resources, pagination: { page: safePage, limit: safeLimit, total, pages: Math.ceil(total / safeLimit) } } });
});

exports.create = asyncHandler(async (req, res) => {
  const business = await Business.findOne({ user: req.user._id });
  if (!business || business.verificationStatus !== 'verified') {
    throw httpError(403, 'Your business must be verified by admin before listing resources.');
  }
  const { name, category, condition, description = '', location = '', availableFrom, availableTo } = req.body;
  const transactionTypes = Array.isArray(req.body.transactionTypes) ? req.body.transactionTypes : String(req.body.transactionTypes || '').split(',').map((type) => type.trim()).filter(Boolean);
  const quantity = Number(req.body.quantity);
  const pricePerPiece = Number(req.body.pricePerPiece);
  if (!name || !category || quantity === undefined || !condition || !transactionTypes.length) throw httpError(400, 'Name, category, quantity, condition and at least one transaction type are required.');
  if (transactionTypes.some((type) => !['rent', 'exchange', 'sell'].includes(type))) throw httpError(400, 'Transaction types may only be rent, exchange or sell.');
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw httpError(400, 'Quantity must be a positive whole number.');
  if (req.body.pricePerPiece === undefined || String(req.body.pricePerPiece).trim() === '' || !Number.isFinite(pricePerPiece) || pricePerPiece < 0 || pricePerPiece > 10000000) throw httpError(400, 'Price per piece must be a valid non-negative amount.');
  const from = new Date(availableFrom);
  const to = new Date(availableTo);
  if (!availableFrom || !availableTo || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    throw httpError(400, 'Please provide a valid availability start and end date.');
  }
  const resource = await Resource.create({ name, category, quantity, condition, exchangeType: transactionTypes[0], transactionTypes: [...new Set(transactionTypes)], pricePerPiece, availableFrom: from, availableTo: to, description, location,
    image: req.file ? `/uploads/resources/${req.file.filename}` : '',
    owner: req.user._id, ownerName: req.user.businessName, verified: false });
  res.status(201).json({ success: true, message: 'Resource listed successfully.', data: { resource } });
});

exports.update = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id);
  if (!resource) throw httpError(404, 'Resource not found.');
  if (!resource.owner || !resource.owner.equals(req.user._id)) throw httpError(403, 'You can only edit your own listings.');
  const { name, category, condition, description = '', location = '', availableFrom, availableTo } = req.body;
  const quantity = Number(req.body.quantity);
  const pricePerPiece = Number(req.body.pricePerPiece);
  const transactionTypes = Array.isArray(req.body.transactionTypes) ? req.body.transactionTypes : String(req.body.transactionTypes || '').split(',').map((type) => type.trim()).filter(Boolean);
  const from = new Date(availableFrom);
  const to = new Date(availableTo);
  if (!name || !category || !condition || !Number.isSafeInteger(quantity) || quantity < 1 || req.body.pricePerPiece === undefined || String(req.body.pricePerPiece).trim() === '' || !Number.isFinite(pricePerPiece) || pricePerPiece < 0 || !transactionTypes.length || transactionTypes.some((type) => !['rent', 'exchange', 'sell'].includes(type)) || !availableFrom || !availableTo || Number.isNaN(from.getTime()) || Number.isNaN(to.getTime()) || from > to) {
    throw httpError(400, 'Provide valid listing details, price, transaction options and availability dates.');
  }
  if (quantity < resource.quantity) throw httpError(400, `Quantity cannot be below the ${resource.quantity} items currently available.`);
  Object.assign(resource, { name, category, condition, description, location, quantity, pricePerPiece, availableFrom: from, availableTo: to, transactionTypes: [...new Set(transactionTypes)], exchangeType: transactionTypes[0] });
  if (req.file) resource.image = `/uploads/resources/${req.file.filename}`;
  await resource.save();
  res.json({ success: true, message: 'Listing updated successfully.', data: { resource } });
});

exports.getOne = asyncHandler(async (req, res) => {
  const resource = await Resource.findById(req.params.id).lean();
  if (!resource) throw httpError(404, 'Resource not found.');
  res.json({ success: true, data: { resource } });
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
