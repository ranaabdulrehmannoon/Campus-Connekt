const mongoose = require('mongoose');

const resourceSchema = new mongoose.Schema({
  resource_id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  uploaded_by: { type: Number, required: true },
  subject: String,
  course_code: String,
  resource_type: {
    type: String,
    enum: ['notes', 'book', 'slides', 'past_paper', 'link', 'other'],
    default: 'other'
  },
  file_path: String,
  external_url: String,
  file_size: Number,
  status: {
    type: String,
    enum: ['pending', 'approved', 'rejected'],
    default: 'pending'
  },
  approved_by: Number,
  approved_at: Date,
  download_count: { type: Number, default: 0 },
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
}, {
  timestamps: false
});

module.exports = mongoose.model('Resource', resourceSchema);