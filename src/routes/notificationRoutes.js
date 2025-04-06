const express = require('express');
const router = express.Router();
const notificationController = require('../controllers/notificationController');
const { authenticateUser } = require('../middleware/auth/userAuth');
const { catchAsync } = require('../middleware/errorHandler');

/**
 * @swagger
 * /users/{userId}/notifications:
 *   get:
 *     summary: Get all notifications for a user
 *     description: Fetch all notifications for a specific user, ordered by creation date.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user.
 *     responses:
 *       200:
 *         description: List of notifications.
 *       404:
 *         description: User not found or no notifications.
 *       500:
 *         description: Server error.
 */
router.get(
  '/users/:userId/notifications', 
  authenticateUser, 
  catchAsync(notificationController.getNotificationsForUser)
);

/**
 * @swagger
 * /users/{userId}/notifications/{notificationId}:
 *   get:
 *     summary: Get a specific notification for a user
 *     description: Fetch a single notification for a user by ID.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user.
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the notification.
 *     responses:
 *       200:
 *         description: A notification object.
 *       404:
 *         description: Notification not found.
 *       500:
 *         description: Server error.
 */
router.get(
  '/users/:userId/notifications/:notificationId', 
  authenticateUser, 
  catchAsync(notificationController.getNotificationById)
);

/**
 * @swagger
 * /users/{userId}/notifications/{notificationId}:
 *   patch:
 *     summary: Mark a notification as read
 *     description: Update a notification's `isRead` status to true.
 *     tags: [Notifications]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the user.
 *       - in: path
 *         name: notificationId
 *         required: true
 *         schema:
 *           type: integer
 *         description: The ID of the notification.
 *     responses:
 *       200:
 *         description: Notification marked as read.
 *       404:
 *         description: Notification not found.
 *       500:
 *         description: Server error.
 */
router.patch(
  '/users/:userId/notifications/:notificationId', 
  authenticateUser, 
  catchAsync(notificationController.markAsRead)
);

module.exports = router;