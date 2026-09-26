const ExchangeRequest = require('../models/ExchangeRequest');
const Resource = require('../models/Resource');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

exports.create = asyncHandler(async (req, res) => {
  const { resourceId, quantity, message = '' } = req.body;
  if (!resourceId || quantity === undefined) throw httpError(400, 'Resource and quantity are required.');
  const resource = await Resource.findById(resourceId);
  if (!resource || resource.status !== 'available') throw httpError(404, 'This resource is no longer available.');
  if (resource.owner && resource.owner.equals(req.user._id)) throw httpError(400, 'You cannot request a resource listed by your own business.');
  if (Number(quantity) > resource.quantity) throw httpError(400, 'Requested quantity exceeds the available amount.');
  const request = await ExchangeRequest.create({ resource: resource._id, owner: resource.owner, requestedBy: req.user._id, quantity, message });
  res.status(201).json({ success: true, message: 'Request sent successfully.', data: { request } });
});

exports.mine = asyncHandler(async (req, res) => {
  const requests = await ExchangeRequest.find({ requestedBy: req.user._id }).populate('resource', 'name category exchangeType').sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: { requests } });
});

exports.received = asyncHandler(async (req, res) => {
  const requests = await ExchangeRequest.find({ owner: req.user._id }).populate('resource', 'name category exchangeType').populate('requestedBy', 'businessName email').sort({ createdAt: -1 }).lean();
  res.json({ success: true, data: { requests } });
});

exports.updateStatus = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['accepted', 'rejected', 'completed'].includes(status)) throw httpError(400, 'Status must be accepted, rejected or completed.');
  const request = await ExchangeRequest.findById(req.params.id);
  if (!request) throw httpError(404, 'Request not found.');
  if (!request.owner || !request.owner.equals(req.user._id)) throw httpError(403, 'Only the resource owner can update this request.');
  if (request.status !== 'pending' && !(request.status === 'accepted' && status === 'completed')) throw httpError(400, 'This request can no longer be updated.');
  request.status = status;
  await request.save();
  res.json({ success: true, message: `Request ${status}.`, data: { request } });
});
