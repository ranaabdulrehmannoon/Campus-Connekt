const Society = require('../models/Society');

const syncSocietyToMongoDB = async (societyData) => {
  try {
    const society = new Society(societyData);
    await society.save();
    console.log(`✅ Synced society ${societyData.society_id} to MongoDB`);
  } catch (error) {
    console.error('❌ MongoDB sync failed for society:', error.message);
  }
};

const updateSocietyInMongoDB = async (societyId, updateData) => {
  try {
    await Society.findOneAndUpdate(
      { society_id: societyId },
      { ...updateData, updated_at: new Date() },
      { new: true, upsert: true }
    );
    console.log(`✅ Updated society ${societyId} in MongoDB`);
  } catch (error) {
    console.error('❌ MongoDB update failed for society:', error.message);
  }
};

const deleteSocietyFromMongoDB = async (societyId) => {
  try {
    await Society.findOneAndDelete({ society_id: societyId });
    console.log(`✅ Deleted society ${societyId} from MongoDB`);
  } catch (error) {
    console.error('❌ MongoDB delete failed for society:', error.message);
  }
};

module.exports = {
  syncSocietyToMongoDB,
  updateSocietyInMongoDB,
  deleteSocietyFromMongoDB,
};