const mongoose = require('mongoose');

const requestSchema = new mongoose.Schema({
  resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
  requestedBy: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  quantity: { type: Number, required: true, min: 1, validate: Number.isInteger },
  message: { type: String, trim: true, maxlength: 1000, default: '' },
  requestType: { type: String, enum: ['rent', 'exchange'], default: 'rent' },
  status: { type: String, enum: ['pending', 'accepted', 'rejected', 'completed'], default: 'pending' }
}, { timestamps: true });

module.exports = mongoose.model('ExchangeRequest', requestSchema);
