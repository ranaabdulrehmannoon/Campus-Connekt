const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const dotenv = require('dotenv');
const path = require('path');

dotenv.config();

const app = express();

// Middleware
app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// Import routes
const authRoutes = require('./src/routes/authRoutes');
const eventRoutes = require('./src/routes/eventRoutes');
const resourceRoutes = require('./src/routes/resourceRoutes');
const dashboardRoutes = require('./src/routes/dashboardRoutes');
const societyRoutes = require('./src/routes/societyRoutes');
const notificationRoutes = require('./src/routes/notificationRoutes');
const adminRoutes = require('./src/routes/adminRoutes');

// Initialize databases (non-blocking; failures should not stop the server)
const pool = require('./src/config/database');
const { connectMongoDB } = require('./src/config/mongodb');

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/resources', resourceRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/societies', societyRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/admin', adminRoutes);

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    success: false,
    message: err.message || 'Internal server error'
  });
});

const PORT = process.env.PORT || 5000;
const server = app.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  // Attempt to connect to MongoDB but do not block server startup
  connectMongoDB();
});

module.exports = server;
