const Event = require('../models/Event');

const syncEventToMongoDB = async (eventData) => {
  try {
    const event = new Event(eventData);
    await event.save();
    console.log(`✅ Synced event ${eventData.event_id} to MongoDB`);
  } catch (error) {
    console.error('❌ MongoDB sync failed for event:', error.message);
  }
};

const updateEventInMongoDB = async (eventId, updateData) => {
  try {
    await Event.findOneAndUpdate(
      { event_id: eventId },
      { ...updateData, updated_at: new Date() },
      { new: true, upsert: true }
    );
    console.log(`✅ Updated event ${eventId} in MongoDB`);
  } catch (error) {
    console.error('❌ MongoDB update failed for event:', error.message);
  }
};

const deleteEventFromMongoDB = async (eventId) => {
  try {
    await Event.findOneAndDelete({ event_id: eventId });
    console.log(`✅ Deleted event ${eventId} from MongoDB`);
  } catch (error) {
    console.error('❌ MongoDB delete failed for event:', error.message);
  }
};

module.exports = {
  syncEventToMongoDB,
  updateEventInMongoDB,
  deleteEventFromMongoDB,
};