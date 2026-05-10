const Notification = require('../models/Notification');

const syncNotificationToMongoDB = async (notificationData) => {
  try {
    const notification = new Notification(notificationData);
    await notification.save();
    console.log(`✅ Synced notification ${notificationData.notification_id} to MongoDB`);
  } catch (error) {
    console.error('❌ MongoDB sync failed for notification:', error.message);
  }
};

const updateNotificationInMongoDB = async (notificationId, updateData) => {
  try {
    await Notification.findOneAndUpdate(
      { notification_id: notificationId },
      updateData,
      { new: true, upsert: true }
    );
    console.log(`✅ Updated notification ${notificationId} in MongoDB`);
  } catch (error) {
    console.error('❌ MongoDB update failed for notification:', error.message);
  }
};

const deleteNotificationFromMongoDB = async (notificationId) => {
  try {
    await Notification.findOneAndDelete({ notification_id: notificationId });
    console.log(`✅ Deleted notification ${notificationId} from MongoDB`);
  } catch (error) {
    console.error('❌ MongoDB delete failed for notification:', error.message);
  }
};

module.exports = {
  syncNotificationToMongoDB,
  updateNotificationInMongoDB,
  deleteNotificationFromMongoDB,
};