const { Notification } = require('../models');

// Get all notifications for a specific user
exports.getNotificationsForUser = async (req, res, next) => {
  try {
    const { userId } = req.params;
    
    // Add authorization check
    if (req.user.id != userId) {
      return res.status(403).json({ message: 'Unauthorized access to notifications' });
    }

    const notifications = await Notification.findAll({ 
      where: { userId }, 
      order: [['createdAt', 'DESC']] 
    });
    
    if (!notifications.length) {
      return res.status(200).json([]);  // Return empty array instead of 404
    }

    res.status(200).json(notifications);
  } catch (error) {
    console.error('Error fetching notifications:', error);
    next(error);
  }
};

// Get a specific notification by ID for a user
exports.getNotificationById = async (req, res, next) => {
  try {
    const { userId, notificationId } = req.params;
    
    // Add authorization check
    if (req.user.id != userId) {
      return res.status(403).json({ message: 'Unauthorized access to notification' });
    }

    const notification = await Notification.findOne({ 
      where: { userId, id: notificationId } 
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    res.status(200).json(notification);
  } catch (error) {
    console.error('Error fetching notification:', error);
    next(error);
  }
};

// Mark a notification as read
exports.markAsRead = async (req, res, next) => {
  try {
    const { userId, notificationId } = req.params;
    
    // Add authorization check
    if (req.user.id != userId) {
      return res.status(403).json({ message: 'Unauthorized access to notification' });
    }

    const notification = await Notification.findOne({ 
      where: { userId, id: notificationId } 
    });
    
    if (!notification) {
      return res.status(404).json({ message: 'Notification not found.' });
    }

    notification.isRead = true;
    await notification.save();

    res.status(200).json({ 
      message: 'Notification marked as read.', 
      notification 
    });
  } catch (error) {
    console.error('Error marking notification as read:', error);
    next(error);
  }
};