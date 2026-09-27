const ExchangeRequest = require('../models/ExchangeRequest');
const Resource = require('../models/Resource');
const Notification = require('../models/Notification');
const Chat = require('../models/Chat');
const ChatMessage = require('../models/ChatMessage');
const Business = require('../models/Business');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

exports.create = asyncHandler(async (req, res) => {
  const { resourceId, quantity, message = '', requestType = 'rent' } = req.body;
  if (!resourceId || quantity === undefined) throw httpError(400, 'Resource and quantity are required.');
  if (!Number.isSafeInteger(quantity) || quantity < 1) throw httpError(400, 'Requested quantity must be a positive whole number.');
  const resource = await Resource.findById(resourceId);
  if (!resource || resource.status !== 'available') throw httpError(404, 'This resource is no longer available.');
  if (resource.owner && resource.owner.equals(req.user._id)) throw httpError(400, 'You cannot request a resource listed by your own business.');
  if (Number(quantity) > resource.quantity) throw httpError(400, 'Requested quantity exceeds the available amount.');
  if (!['rent', 'exchange', 'sell'].includes(requestType)) throw httpError(400, 'Request type must be rent, exchange or sell.');
  const offeredTypes = resource.transactionTypes && resource.transactionTypes.length ? resource.transactionTypes : [resource.exchangeType];
  if (!offeredTypes.includes(requestType)) throw httpError(400, `This listing is not offered for ${requestType}.`);
  if (requestType === 'exchange') {
    const [requesterBusiness, ownerBusiness] = await Promise.all([
      Business.findOne({ user: req.user._id, verificationStatus: 'verified' }),
      Business.findOne({ user: resource.owner, verificationStatus: 'verified' })
    ]);
    if (!requesterBusiness || !ownerBusiness) throw httpError(403, 'Only verified vendors can exchange resources with another verified vendor.');
  }
  const request = await ExchangeRequest.create({ resource: resource._id, owner: resource.owner, requestedBy: req.user._id, quantity, message, requestType,
    paymentStatus: requestType === 'exchange' ? 'not_required' : 'awaiting_payment' });
  if (resource.owner) {
    await Notification.create({
      user: resource.owner,
      title: `New ${requestType} request`,
      message: `${req.user.businessName} wants to ${requestType} ${quantity} × ${resource.name}.`,
      action: { type: 'request', request: request._id }
    });
  }
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
      let chat = await Chat.findOne({ request: updated._id });
      if (!chat) {
        chat = await Chat.create({ request: updated._id, resource: updated.resource, participants: [updated.owner, updated.requestedBy], lastMessageAt: new Date() });
        const ownerBusiness = await Business.findOne({ user: updated.owner }).lean();
        if (ownerBusiness && ['rent', 'sell'].includes(updated.requestType)) {
          await ChatMessage.create({
            chat: chat._id,
            sender: updated.owner,
            text: `${updated.requestType === 'sell' ? 'Purchase' : 'Rent'} request accepted. Please pay to UPI ID: ${ownerBusiness.upiId}. Upload your payment screenshot here after paying.`,
            image: ownerBusiness.qrCode || ''
          });
        }
      }
      await Notification.create({
        user: updated.requestedBy,
        title: `${updated.requestType === 'sell' ? 'Purchase' : updated.requestType === 'exchange' ? 'Exchange' : 'Rent'} request accepted`,
        message: `Your request for ${resource.name} was accepted. Your chat is ready.`,
        action: { type: '', request: null }
      });
      return res.json({ success: true, message: 'Request accepted and chat created.', data: { request: updated, resource, chat } });
    } catch (error) {
      if (!stockRestored) {
        // Only roll stock back when the request update itself did not succeed.
        // Chat/notification failures must not undo an already accepted rental.
        const latestRequest = await ExchangeRequest.findById(request._id).select('status').lean();
        if (latestRequest && latestRequest.status === 'pending') {
          await Resource.updateOne({ _id: resource._id }, { $inc: { quantity: request.quantity }, $set: { status: 'available' } });
        }
      }
      throw error;
    }
  }

  const allowedCurrentStatus = status === 'completed' ? 'accepted' : 'pending';
  const updated = await ExchangeRequest.findOneAndUpdate(
    { _id: request._id, status: allowedCurrentStatus }, { $set: { status } }, { new: true }
  );
  if (!updated) throw httpError(400, 'This request can no longer be updated.');
  if (status === 'rejected') {
    const resource = await Resource.findById(updated.resource).lean();
    await Notification.create({ user: updated.requestedBy, title: 'Rent request declined', message: `Your request for ${resource ? resource.name : 'this resource'} was declined.` });
  }
  res.json({ success: true, message: `Request ${status}.`, data: { request: updated } });
});

exports.submitPayment = asyncHandler(async (req, res) => {
  if (!req.file) throw httpError(400, 'Please upload a payment screenshot.');
  const request = await ExchangeRequest.findOne({ _id: req.params.id, requestedBy: req.user._id, status: 'accepted' });
  if (!request) throw httpError(404, 'Accepted payment request not found.');
  if (!['rent', 'sell'].includes(request.requestType)) throw httpError(400, 'Payment screenshots are only needed for rent or purchase requests.');
  request.paymentStatus = 'submitted';
  request.paymentScreenshot = `/uploads/payments/${req.file.filename}`;
  request.paymentSubmittedAt = new Date();
  await request.save();
  await Notification.create({
    user: request.owner,
    title: 'Payment screenshot submitted',
    message: `${req.user.businessName} submitted payment proof. Please verify it.`,
    action: { type: 'payment', request: request._id }
  });
  res.json({ success: true, message: 'Payment screenshot submitted for vendor verification.', data: { request } });
});

exports.verifyPayment = asyncHandler(async (req, res) => {
  const { status } = req.body;
  if (!['verified', 'rejected'].includes(status)) throw httpError(400, 'Payment status must be verified or rejected.');
  const request = await ExchangeRequest.findOne({ _id: req.params.id, owner: req.user._id, status: 'accepted', paymentStatus: 'submitted' });
  if (!request) throw httpError(404, 'Submitted payment not found.');
  request.paymentStatus = status;
  request.paymentVerifiedAt = status === 'verified' ? new Date() : null;
  await request.save();
  await Notification.create({
    user: request.requestedBy,
    title: status === 'verified' ? 'Payment verified' : 'Payment needs attention',
    message: status === 'verified' ? 'Your payment was verified. You can now rate this vendor.' : 'Your payment proof was not accepted. Please upload a new screenshot.'
  });
  res.json({ success: true, message: `Payment ${status}.`, data: { request } });
});

exports.rate = asyncHandler(async (req, res) => {
  const score = Number(req.body.score);
  const comment = String(req.body.comment || '').trim();
  if (!Number.isInteger(score) || score < 1 || score > 5) throw httpError(400, 'Rating must be a whole number from 1 to 5.');
  const request = await ExchangeRequest.findOne({ _id: req.params.id, requestedBy: req.user._id, paymentStatus: 'verified' });
  if (!request) throw httpError(404, 'A verified payment is required before rating this vendor.');
  if (request.rating && request.rating.score) throw httpError(409, 'You have already rated this order.');
  request.rating = { score, comment, ratedAt: new Date() };
  await request.save();
  res.json({ success: true, message: 'Thanks for rating this vendor.', data: { request } });
});
