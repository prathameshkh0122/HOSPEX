const fs = require('fs');
const Business = require('../models/Business');
const Notification = require('../models/Notification');
const Resource = require('../models/Resource');
const ExchangeRequest = require('../models/ExchangeRequest');
const asyncHandler = require('../utils/asyncHandler');
const httpError = require('../utils/httpError');

function cleanupUploadedFiles(files) {
  if (!files) return;
  Object.values(files).flat().forEach((file) => {
    fs.unlink(file.path, () => {});
  });
}

exports.register = asyncHandler(async (req, res) => {
  const {
    businessName, businessType, ownerName, address, cityState,
    contactNumber, businessEmail, description = '', licenseNumber, upiId
  } = req.body;

  const required = { businessName, businessType, ownerName, address, cityState, contactNumber, businessEmail, licenseNumber, upiId };
  const missing = Object.entries(required).filter(([, value]) => !value || !String(value).trim());
  const licenseDocument = req.files && req.files.licenseDocument && req.files.licenseDocument[0];
  const qrCode = req.files && req.files.qrCode && req.files.qrCode[0];

  if (missing.length || !licenseDocument || !qrCode) {
    cleanupUploadedFiles(req.files);
    if (missing.length) throw httpError(400, `The following fields are required: ${missing.map(([key]) => key).join(', ')}.`);
    throw httpError(400, 'Both the license/registration document and payment QR code are required.');
  }

  const existing = await Business.findOne({ user: req.user._id });
  if (existing && existing.verificationStatus !== 'rejected') {
    cleanupUploadedFiles(req.files);
    throw httpError(409, 'A business application already exists for your account.');
  }

  const payload = {
    user: req.user._id,
    businessName, businessType, ownerName, address, cityState,
    contactNumber, businessEmail, description,
    licenseNumber,
    licenseDocument: `/uploads/licenses/${licenseDocument.filename}`,
    upiId,
    qrCode: `/uploads/qr/${qrCode.filename}`,
    verificationStatus: 'pending',
    rejectionReason: '',
    submittedAt: new Date(),
    verifiedAt: null
  };

  let business;
  if (existing) {
    // Re-submission after a rejection: replace old documents and reset to pending.
    fs.unlink(require('path').join(__dirname, '..', '..', existing.licenseDocument), () => {});
    fs.unlink(require('path').join(__dirname, '..', '..', existing.qrCode), () => {});
    Object.assign(existing, payload);
    business = await existing.save();
  } else {
    business = await Business.create(payload);
  }

  await Notification.create({
    user: req.user._id,
    title: 'Business application submitted',
    message: 'Your business registration has been submitted and is pending admin verification.'
  });

  res.status(201).json({ success: true, message: 'Business submitted for verification.', data: { business } });
});

exports.mine = asyncHandler(async (req, res) => {
  const [business, ratingRows] = await Promise.all([
    Business.findOne({ user: req.user._id }),
    ExchangeRequest.aggregate([{ $match: { owner: req.user._id, 'rating.score': { $ne: null } } }, { $group: { _id: null, average: { $avg: '$rating.score' }, count: { $sum: 1 } } }])
  ]);
  res.json({
    success: true,
    data: {
      business,
      verificationStatus: business ? business.verificationStatus : 'none',
      rating: ratingRows[0] ? { average: ratingRows[0].average, count: ratingRows[0].count } : { average: 0, count: 0 }
    }
  });
});

// Public-facing vendor data deliberately excludes payment identifiers and documents.
exports.publicProfile = asyncHandler(async (req, res) => {
  const business = await Business.findOne({ user: req.params.userId, verificationStatus: 'verified' }).lean();
  if (!business) throw httpError(404, 'Verified vendor profile not found.');
  const [resources, ratingRows] = await Promise.all([
    Resource.find({ owner: business.user, status: 'available' }).sort({ createdAt: -1 }).lean(),
    ExchangeRequest.aggregate([{ $match: { owner: business.user, 'rating.score': { $ne: null } } }, { $group: { _id: null, average: { $avg: '$rating.score' }, count: { $sum: 1 } } }])
  ]);
  const { licenseDocument, licenseNumber, upiId, qrCode, ...publicBusiness } = business;
  const rating = ratingRows[0] ? { average: ratingRows[0].average, count: ratingRows[0].count } : { average: 0, count: 0 };
  res.json({ success: true, data: { business: publicBusiness, resources, rating } });
});
