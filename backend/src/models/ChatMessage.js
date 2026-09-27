const mongoose = require('mongoose');

const chatMessageSchema = new mongoose.Schema({
  chat: { type: mongoose.Schema.Types.ObjectId, ref: 'Chat', required: true, index: true },
  sender: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  text: { type: String, trim: true, maxlength: 2000, default: '' },
  image: { type: String, default: '' }
}, { timestamps: true });

chatMessageSchema.index({ chat: 1, createdAt: 1 });
module.exports = mongoose.model('ChatMessage', chatMessageSchema);
