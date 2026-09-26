const ExchangeRequest = require('../models/ExchangeRequest');
const Resource = require('../models/Resource');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

exports.create = asyncHandler(async (req, res) => {
  const { resourceId, quantity, message = '' } = req.body;
  if (!resourceId || quantity === undefined) throw httpError(400, 'Resource and quantity are required.');
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw httpError(400, 'Requested quantity must be a positive whole number.');
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
  if (status === 'accepted') {
    if (request.status !== 'pending') throw httpError(400, 'Only pending requests can be accepted.');

    // Decrement stock in one atomic database operation so two approvals cannot oversell it.
    const resource = await Resource.findOneAndUpdate(
      { _id: request.resource, status: 'available', quantity: { $gte: request.quantity } },
      [{ $set: {
        quantity: { $subtract: ['$quantity', request.quantity] },
        status: { $cond: [{ $eq: [{ $subtract: ['$quantity', request.quantity] }, 0] }, 'completed', 'available'] }
      } }],
      { new: true }
    );
    if (!resource) throw httpError(409, 'There is not enough stock left to accept this request.');

    let stockRestored = false;
    try {
      const updated = await ExchangeRequest.findOneAndUpdate(
        { _id: request._id, status: 'pending' }, { $set: { status: 'accepted' } }, { new: true }
      );
      if (!updated) {
        await Resource.updateOne({ _id: resource._id }, { $inc: { quantity: request.quantity }, $set: { status: 'available' } });
        stockRestored = true;
        throw httpError(409, 'This request was updated by another user. Please refresh and try again.');
      }
      return res.json({ success: true, message: 'Request accepted.', data: { request: updated, resource } });
    } catch (error) {
      if (!stockRestored) {
        await Resource.updateOne({ _id: resource._id }, { $inc: { quantity: request.quantity }, $set: { status: 'available' } });
      }
      throw error;
    }
  }

  const allowedCurrentStatus = status === 'completed' ? 'accepted' : 'pending';
  const updated = await ExchangeRequest.findOneAndUpdate(
    { _id: request._id, status: allowedCurrentStatus }, { $set: { status } }, { new: true }
  );
  if (!updated) throw httpError(400, 'This request can no longer be updated.');
  res.json({ success: true, message: `Request ${status}.`, data: { request: updated } });
});
