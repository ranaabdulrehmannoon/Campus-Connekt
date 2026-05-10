const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectMongoDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campus_connekt';
    // Recommended production-safe options
    await mongoose.connect(mongoURI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      family: 4,
    });
    console.log('MongoDB connected');
  } catch (error) {
    console.warn('Running without database connection');
    if (process.env.NODE_ENV !== 'production') {
      // In non-production, surface the underlying error for debugging
      console.debug('MongoDB connection error:', error);
    }
    // Do not rethrow or exit — allow the server to run without DB
  }
};

module.exports = { connectMongoDB };
