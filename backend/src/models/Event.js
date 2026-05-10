const mongoose = require('mongoose');

const eventSchema = new mongoose.Schema({
  event_id: { type: Number, required: true, unique: true },
  title: { type: String, required: true },
  description: String,
  society_id: Number,
  created_by: { type: Number, required: true },
  location: String,
  start_datetime: { type: Date, required: true },
  end_datetime: { type: Date, required: true },
  thumbnail: String,
  category: {
    type: String,
    enum: ['workshop', 'seminar', 'competition', 'social', 'sports', 'cultural', 'meetup', 'other'],
    default: 'other'
  },
  capacity: Number,
  registered_count: { type: Number, default: 0 },
  status: {
    type: String,
    enum: ['draft', 'open', 'closed', 'cancelled', 'completed'],
    default: 'draft'
  },
  is_approved: { type: Boolean, default: false },
  approved_by: Number,
  approved_at: Date,
  created_at: { type: Date, default: Date.now },
  updated_at: { type: Date, default: Date.now },
  registration_deadline: Date,
  visibility: { type: String, enum: ['public', 'society_only'], default: 'public' },
}, {
  timestamps: false
});

module.exports = mongoose.model('Event', eventSchema);