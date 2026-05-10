const express = require('express');
const { protect } = require('../middleware/auth');
const { getSummary } = require('../controllers/dashboardController');

const router = express.Router();

router.get('/summary', protect, getSummary);

module.exports = router;