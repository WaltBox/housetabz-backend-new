// routes/notificationRoutes.js
const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateUser } = require('../middleware/auth/userAuth');

// Get all notifications for a user
router.get('/users/:userId/notifications', authenticateUser, notificationController.getNotificationsForUser);

// Get a specific notification
router.get('/users/:userId/notifications/:notificationId', authenticateUser, notificationController.getNotificationById);

// Mark a notification as read
router.put('/users/:userId/notifications/:notificationId/read', authenticateUser, notificationController.markAsRead);

// Register device token for push notifications
router.post('/users/device-token', authenticateUser, notificationController.registerDeviceToken);

// Unregister device token
router.delete('/users/device-token', authenticateUser, notificationController.unregisterDeviceToken);

// Create notification (admin/system endpoint)
router.post('/notifications', notificationController.createNotification);

router.post('/test-push', authenticateUser, async (req, res, next) => {
  try {
    // Send to the current user
    const userId = req.user.id;
    
    // Create a test notification
    const notificationData = {
      userId,
      title: 'Test Notification',
      message: 'This is a test push notification from HouseTabz!',
      type: 'test',
      data: {
        testTimestamp: new Date().toISOString()
      }
    };
    
    // Use your existing createNotification function
    await notificationController.createNotification(
      { body: notificationData },
      { 
        status: function() { 
          return this; 
        }, 
        json: function(data) { 
          res.status(201).json(data); 
        } 
      },
      next
    );
  } catch (error) {
    console.error('Error sending test notification:', error);
    res.status(500).json({ error: 'Failed to send test notification' });
  }
});
module.exports = router;