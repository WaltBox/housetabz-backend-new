const express = require('express');
const router = express.Router();
// Import the correct authentication middleware function
const { authenticateUser } = require('../middleware/auth/userAuth');
const {
  getUrgentMessages,
  markAsRead,
  getUnreadCount  // Add the new controller function
} = require('../controllers/urgentMessageController');

/**
 * GET /api/urgent-messages
 * Fetch all urgent messages for the authenticated user
 */
router.get('/', authenticateUser, getUrgentMessages);

/**
 * GET /api/urgent-messages/count
 * Get count of unread messages for the authenticated user
 */
router.get('/count', authenticateUser, getUnreadCount);

/**
 * PATCH /api/urgent-messages/:id/read
 * Mark a specific urgent message as read
 */
router.patch('/:id/read', authenticateUser, markAsRead);

module.exports = router;