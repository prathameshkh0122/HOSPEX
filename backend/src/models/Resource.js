const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  name: { type: String, required: true, trim: true, maxlength: 120 },
  category: { type: String, required: true, enum: ['food', 'furniture', 'equipment', 'linen', 'supplies', 'packaging'] },
  quantity: { type: Number, required: true, min: 1, max: 1000000, validate: Number.isInteger },
  condition: { type: String, required: true, enum: ['new', 'good', 'used'] },
  // exchangeType is retained as the primary type for legacy listings and older UI clients.
  exchangeType: { type: String, required: true, enum: ['exchange', 'rent', 'sell', 'donate'] },
  transactionTypes: [{ type: String, enum: ['rent', 'exchange', 'sell'] }],
  pricePerPiece: { type: Number, min: 0, max: 10000000, default: null },
  availableFrom: { type: Date, default: null },
  availableTo: { type: Date, default: null },
  description: { type: String, trim: true, maxlength: 1000, default: '' },
  location: { type: String, trim: true, maxlength: 160, default: '' },
  image: { type: String, default: '' },
  // ownerName is a snapshot so listings remain readable if a business is removed.
  owner: { type: mongoose.Schema.Types.ObjectId, ref: 'User', default: null },
  ownerName: { type: String, required: true, trim: true },
  distance: { type: Number, min: 0, default: null },
  verified: { type: Boolean, default: false },
  status: { type: String, enum: ['available', 'reserved', 'completed'], default: 'available' }
}, { timestamps: true });

resourceSchema.index({ status: 1, category: 1, createdAt: -1 });
resourceSchema.index({ name: 'text', description: 'text', ownerName: 'text' });
module.exports = mongoose.model('Resource', resourceSchema);
