const mongoose = require('mongoose');

const chatSchema = new mongoose.Schema({
  request: { type: mongoose.Schema.Types.ObjectId, ref: 'ExchangeRequest', required: true, unique: true },
  resource: { type: mongoose.Schema.Types.ObjectId, ref: 'Resource', required: true },
  participants: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }],
  lastMessageAt: { type: Date, default: Date.now }
}, { timestamps: true });

chatSchema.index({ participants: 1, lastMessageAt: -1 });
module.exports = mongoose.model('Chat', chatSchema);
