const mongoose = require('mongoose');

const societySchema = new mongoose.Schema({
  society_id: { type: Number, required: true, unique: true },
  name: { type: String, required: true, unique: true },
  description: String,
  logo: String,
  category: {
    type: String,
    enum: ['technical', 'cultural', 'sports', 'literary', 'social', 'religious', 'other'],
    default: 'other'
  },
  created_by: { type: Number, required: true },
  is_approved: { type: Boolean, default: false },
  approved_by: Number,
  approved_at: Date,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, {
  timestamps: false
});

module.exports = mongoose.model('Society', societySchema);