const express = require('express');
const router = express.Router();
const { createFeedback } = require('../controllers/feedbackController');
const { authenticateUser } = require('../middleware/auth/userAuth');

// Create new feedback (only authenticated users)
router.post('/feedback', authenticateUser, createFeedback);

module.exports = router;
