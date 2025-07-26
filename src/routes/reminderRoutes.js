// src/routes/reminderRoutes.js
const express = require('express');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth/userAuth');
const reminderController = require('../controllers/reminderController');

// Check if a user is in cooldown period for reminders
router.get('/users/:userId/reminder-status', authenticateUser, reminderController.checkReminderStatus);

// Get reminder logs for a user
router.get('/users/:userId/reminder-logs', authenticateUser, reminderController.getReminderLogs);

// Send a reminder to another user
router.post('/users/:userId/send-reminder', authenticateUser, reminderController.sendReminder);

module.exports = router;