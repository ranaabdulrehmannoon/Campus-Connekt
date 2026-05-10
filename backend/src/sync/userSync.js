const User = require('../models/User');

const syncUserToMongoDB = async (userData) => {
  try {
    const user = new User(userData);
    await user.save();
    console.log(`✅ Synced user ${userData.user_id} to MongoDB`);
  } catch (error) {
    console.error('❌ MongoDB sync failed for user:', error.message);
    // Don't throw - MongoDB sync failure shouldn't break the flow
  }
};

const updateUserInMongoDB = async (userId, updateData) => {
  try {
    await User.findOneAndUpdate(
      { user_id: userId },
      { ...updateData, updated_at: new Date() },
      { new: true, upsert: true }
    );
    console.log(`✅ Updated user ${userId} in MongoDB`);
  } catch (error) {
    console.error('❌ MongoDB update failed for user:', error.message);
  }
};

const deleteUserFromMongoDB = async (userId) => {
  try {
    await User.findOneAndDelete({ user_id: userId });
    console.log(`✅ Deleted user ${userId} from MongoDB`);
  } catch (error) {
    console.error('❌ MongoDB delete failed for user:', error.message);
  }
};

module.exports = {
  syncUserToMongoDB,
  updateUserInMongoDB,
  deleteUserFromMongoDB,
};