const mongoose = require('mongoose');

const notificationSchema = new mongoose.Schema({
  notification_id: { type: Number, required: true, unique: true },
  user_id: { type: Number, required: true },
  title: { type: String, required: true },
  message: { type: String, required: true },
  type: {
    type: String,
    enum: ['event_reminder', 'registration_confirm', 'resource_approved', 'resource_rejected', 'announcement', 'society_invite', 'admin_alert', 'general'],
    default: 'general'
  },
  reference_id: Number,
  reference_type: String,
  is_read: { type: Boolean, default: false },
  created_at: { type: Date, default: Date.now },
}, {
  timestamps: false
});

module.exports = mongoose.model('Notification', notificationSchema);