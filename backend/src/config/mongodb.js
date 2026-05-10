const mongoose = require('mongoose');
const dotenv = require('dotenv');

dotenv.config();

const connectMongoDB = async () => {
  try {
    const mongoURI = process.env.MONGODB_URI || 'mongodb://localhost:27017/campus_connekt';
    await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
      socketTimeoutMS: 45000,
      maxPoolSize: 10,
      family: 4,
      tls: true,
      tlsAllowInvalidCertificates: true, // Allow invalid certificates for testing
      tlsAllowInvalidHostnames: true,   // Allow invalid hostnames for testing
    });
    console.log('✅ MongoDB connected successfully');
  } catch (error) {
    console.error('❌ MongoDB connection failed:', error.message);
    console.error('Full error:', error);
    // Don't exit process - MongoDB is secondary
  }
};

module.exports = { connectMongoDB };