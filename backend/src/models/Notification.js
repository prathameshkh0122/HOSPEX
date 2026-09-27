const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, index: true },
  title: { type: String, required: true, trim: true, maxlength: 150 },
  message: { type: String, required: true, trim: true, maxlength: 500 },
  read: { type: Boolean, default: false },
  action: {
    type: { type: String, enum: ['', 'request'], default: '' },
    request: { type: mongoose.Schema.Types.ObjectId, ref: 'ExchangeRequest', default: null }
  }
}, { timestamps: true });

notificationSchema.index({ user: 1, createdAt: -1 });
module.exports = mongoose.model('Notification', notificationSchema);
