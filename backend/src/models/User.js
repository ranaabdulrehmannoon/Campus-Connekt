const mongoose = require('mongoose');

const userSchema = new mongoose.Schema({
  user_id: { type: Number, required: true, unique: true },
  email: { type: String, required: true, unique: true },
  password_hash: { type: String, required: true },
  role: { type: String, enum: ['student', 'society_admin', 'admin'], default: 'student' },
  first_name: { type: String, required: true },
  last_name: { type: String, required: true },
  phone: String,
  bio: String,
  profile_picture: String,
  department: String,
  batch_year: Number,
  is_active: { type: Boolean, default: true },
  is_verified: { type: Boolean, default: false },
  verification_token: String,
  reset_token: String,
  reset_token_expires: Date,
  last_login: Date,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  // Additional fields from schema updates
  requested_role: { type: String, enum: ['student', 'society_admin'] },
  approval_status: { type: String, enum: ['pending', 'approved', 'rejected'], default: 'approved' },
  approved_by: Number,
  approved_at: Date,
  approval_requested_at: Date,
  verification_code_hash: String,
  verification_code_expires: Date,
}, {
  timestamps: false // We handle timestamps manually to match MySQL
});

module.exports = mongoose.model('User', userSchema);