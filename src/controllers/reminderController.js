// src/controllers/reminderController.js

const { User, ReminderLog, Notification, sequelize } = require('../models');
const { Op } = require('sequelize');
const { sendPushNotification } = require('../services/pushNotificationService');
const { ONE_DAY_MS } = require('../utils/constants');

/**
 * Check if a user is in cooldown period for reminders
 * GET /api/users/:userId/reminder-status
 */
exports.checkReminderStatus = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const senderId = req.user.id;
    
    // Verify users exist
    const [sender, recipient] = await Promise.all([
      User.findByPk(senderId),
      User.findByPk(userId)
    ]);
    
    if (!sender || !recipient) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Use raw query to check if sender has sent a reminder to this recipient in the last 24 hours
    const [recentReminders] = await sequelize.query(`
      SELECT * FROM "ReminderLogs" 
      WHERE sender_id = :senderId 
      AND recipient_id = :recipientId 
      AND created_at > NOW() - INTERVAL '1 day'
      LIMIT 1
    `, {
      replacements: { 
        senderId, 
        recipientId: userId 
      },
      type: sequelize.QueryTypes.SELECT
    });
    
    const recentReminder = recentReminders && recentReminders.length > 0 ? recentReminders[0] : null;
    
    // Return the cooldown status
    res.json({
      inCooldown: !!recentReminder,
      cooldownEnds: recentReminder ? new Date(new Date(recentReminder.created_at).getTime() + ONE_DAY_MS) : null
    });
  } catch (err) {
    console.error('Error in checkReminderStatus:', err);
    next(err);
  }
};

/**
 * Send a reminder to another user
 * POST /api/users/:userId/send-reminder
 */
exports.sendReminder = async (req, res, next) => {
  try {
    const { userId } = req.params;
    const senderId = req.user.id;
    const { message, billId } = req.body;
    
    if (!message || !billId) {
      return res.status(400).json({ error: 'Message and billId are required' });
    }
    
    // Verify users exist
    const [sender, recipient] = await Promise.all([
      User.findByPk(senderId),
      User.findByPk(userId)
    ]);
    
    if (!sender || !recipient) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Use raw query to check if sender has sent a reminder to this recipient in the last 24 hours
    const [recentReminders] = await sequelize.query(`
      SELECT * FROM "ReminderLogs" 
      WHERE sender_id = :senderId 
      AND recipient_id = :recipientId 
      AND created_at > NOW() - INTERVAL '1 day'
      LIMIT 1
    `, {
      replacements: { 
        senderId, 
        recipientId: userId 
      },
      type: sequelize.QueryTypes.SELECT
    });
    
    const recentReminder = recentReminders && recentReminders.length > 0 ? recentReminders[0] : null;
    
    if (recentReminder) {
      return res.status(429).json({ 
        error: 'Reminder limit reached',
        message: 'You can only send one reminder to this user per day'
      });
    }
    
    // Create a log entry for this reminder using raw query
    await sequelize.query(`
      INSERT INTO "ReminderLogs" (sender_id, recipient_id, bill_id, message, created_at)
      VALUES (:senderId, :recipientId, :billId, :message, NOW())
    `, {
      replacements: {
        senderId,
        recipientId: userId,
        billId,
        message
      },
      type: sequelize.QueryTypes.INSERT
    });
    
    // Create an in-app notification
    const notification = await Notification.create({
      userId: parseInt(userId, 10),
      message: message,
      isRead: false
    });
    
    // Try to send push notification, but don't let it fail the whole request
    try {
      // Pass a user object with an id property as required by the service
      await sendPushNotification(
        { id: parseInt(userId, 10) }, // Pass user object with id
        {
          title: `${sender.username} sent you a reminder`,
          message: message, // Note: pushNotificationService expects 'message', not 'body'
          data: {
            type: 'bill_reminder',
            notificationId: notification.id,
            billId
          }
        }
      );
     
    } catch (pushError) {
      console.error('Error sending push notification:', pushError);
      // Continue execution - don't let push notification failure affect the API response
    }
    
    res.status(200).json({ 
      success: true,
      message: 'Reminder sent successfully'
    });
  } catch (err) {
    console.error('Error in sendReminder:', err);
    next(err);
  }
};