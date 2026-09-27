const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
  message: { type: String, trim: true, maxlength: 1000, default: '' },
  requestType: { type: String, enum: ['rent', 'exchange', 'sell'], default: 'rent' },
  paymentStatus: { type: String, enum: ['not_required', 'awaiting_payment', 'submitted', 'verified', 'rejected'], default: 'awaiting_payment' },
  paymentScreenshot: { type: String, default: '' },
  paymentSubmittedAt: { type: Date, default: null },
  paymentVerifiedAt: { type: Date, default: null },
  rating: {
    score: { type: Number, min: 1, max: 5, default: null },
    comment: { type: String, trim: true, maxlength: 500, default: '' },
    ratedAt: { type: Date, default: null }
  },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('ExchangeRequest', requestSchema);
