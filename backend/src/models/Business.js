const mongoose = require('mongoose');

const businessSchema = new mongoose.Schema({
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true, unique: true },

  businessName: { type: String, required: true, trim: true, maxlength: 120 },
  businessType: { type: String, required: true, trim: true, maxlength: 60 },
  ownerName: { type: String, required: true, trim: true, maxlength: 120 },
  address: { type: String, required: true, trim: true, maxlength: 250 },
  cityState: { type: String, required: true, trim: true, maxlength: 120 },
  contactNumber: { type: String, required: true, trim: true, maxlength: 20 },
  businessEmail: { type: String, required: true, trim: true, lowercase: true, maxlength: 254 },
  description: { type: String, trim: true, maxlength: 1000, default: '' },

  licenseNumber: { type: String, required: true, trim: true, maxlength: 100 },
  licenseDocument: { type: String, required: true }, // stored relative file path
  upiId: { type: String, required: true, trim: true, maxlength: 100 },
  qrCode: { type: String, required: true }, // stored relative file path

  verificationStatus: { type: String, enum: ['pending', 'verified', 'rejected'], default: 'pending' },
  rejectionReason: { type: String, trim: true, maxlength: 500, default: '' },

  submittedAt: { type: Date, default: Date.now },
  verifiedAt: { type: Date, default: null }
}, { timestamps: true });

module.exports = mongoose.model('Business', businessSchema);
