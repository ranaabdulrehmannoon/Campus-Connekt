const Resource = require('../models/Resource');

const syncResourceToMongoDB = async (resourceData) => {
  try {
    const resource = new Resource(resourceData);
    await resource.save();
    console.log(`✅ Synced resource ${resourceData.resource_id} to MongoDB`);
  } catch (error) {
    console.error('❌ MongoDB sync failed for resource:', error.message);
  }
};

const updateResourceInMongoDB = async (resourceId, updateData) => {
  try {
    await Resource.findOneAndUpdate(
      { resource_id: resourceId },
      { ...updateData, updated_at: new Date() },
      { new: true, upsert: true }
    );
    console.log(`✅ Updated resource ${resourceId} in MongoDB`);
  } catch (error) {
    console.error('❌ MongoDB update failed for resource:', error.message);
  }
};

const deleteResourceFromMongoDB = async (resourceId) => {
  try {
    await Resource.findOneAndDelete({ resource_id: resourceId });
    console.log(`✅ Deleted resource ${resourceId} from MongoDB`);
  } catch (error) {
    console.error('❌ MongoDB delete failed for resource:', error.message);
  }
};

module.exports = {
  syncResourceToMongoDB,
  updateResourceInMongoDB,
  deleteResourceFromMongoDB,
};