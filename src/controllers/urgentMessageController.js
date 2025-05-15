// src/controllers/urgentMessageController.js
const { UrgentMessage, Bill, User, Charge, House } = require('../models');

/**
 * GET /api/urgent-messages
 * Fetch all urgent messages for the authenticated user, newest first
 */
exports.getUrgentMessages = async (req, res, next) => {
  try {
    const messages = await UrgentMessage.findAll({
      where: { 
        userId: req.user.id,
        isResolved: false // Only get non-resolved messages
      },
      order: [['created_at', 'DESC']],
      include: [
        { model: Bill, as: 'bill', attributes: ['id', 'name', 'baseAmount', 'dueDate'] },
        { model: Charge, as: 'charge', attributes: ['id', 'baseAmount', 'status', 'dueDate'] }
      ]
    });

    // Parse metadata JSON if stored as string
    const processedMessages = messages.map(message => {
      const messageObj = message.toJSON();
      if (messageObj.metadata && typeof messageObj.metadata === 'string') {
        try {
          messageObj.metadata = JSON.parse(messageObj.metadata);
        } catch (e) {
          console.error('Error parsing metadata JSON:', e);
          messageObj.metadata = {};
        }
      }
      return messageObj;
    });

    res.json({ messages: processedMessages });
  } catch (err) {
    next(err);
  }
};

/**
 * PATCH /api/urgent-messages/:id/read
 * Mark a specific urgent message as read
 */
exports.markAsRead = async (req, res, next) => {
  const { id } = req.params;
  try {
    const [updatedCount] = await UrgentMessage.update(
      { isRead: true },
      { where: { id, userId: req.user.id } }
    );

    if (updatedCount === 0) {
      return res.status(404).json({ error: 'Urgent message not found' });
    }

    res.sendStatus(204);
  } catch (err) {
    next(err);
  }
};

/**
 * GET /api/urgent-messages/count
 * Get count of unread messages
 */
exports.getUnreadCount = async (req, res, next) => {
  try {
    const count = await UrgentMessage.count({
      where: { 
        userId: req.user.id, 
        isRead: false,
        isResolved: false
      }
    });

    res.json({ count });
  } catch (err) {
    next(err);
  }
};