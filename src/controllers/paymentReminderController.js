// src/controllers/paymentReminderController.js - Payment Reminder Management
const paymentReminderService = require('../services/paymentReminderService');
const paymentReminderWorker = require('../workers/paymentReminderWorker');

/**
 * Manual trigger for payment reminders (admin only)
 * POST /api/reminders/trigger
 */
exports.triggerReminders = async (req, res, next) => {
  try {
    console.log('🔄 Manual trigger: Payment reminders requested');
    
    const results = await paymentReminderService.sendPaymentReminders();
    
    res.json({
      success: true,
      message: 'Payment reminders triggered successfully',
      results: {
        advanceReminders: results.advanceReminders,
        overdueReminders: results.overdueReminders,
        roommateAlerts: results.roommateAlerts,
        errors: results.errors.length
      },
      timestamp: new Date().toISOString()
    });
    
  } catch (error) {
    console.error('❌ Error triggering payment reminders:', error);
    next(error);
  }
};

/**
 * Get payment reminder statistics
 * GET /api/reminders/stats
 */
exports.getReminderStats = async (req, res, next) => {
  try {
    const workerStatus = paymentReminderWorker.getStatus();
    
    res.json({
      success: true,
      data: {
        worker: workerStatus,
        config: {
          advanceReminderDays: paymentReminderService.REMINDER_CONFIG.ADVANCE_REMINDERS,
          overdueReminderDays: paymentReminderService.REMINDER_CONFIG.OVERDUE_REMINDERS,
          cooldownHours: paymentReminderService.REMINDER_CONFIG.COOLDOWN_HOURS
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting reminder stats:', error);
    next(error);
  }
};

/**
 * Get payment reminder statistics for a specific house
 * GET /api/reminders/house/:houseId/stats
 */
exports.getHouseReminderStats = async (req, res, next) => {
  try {
    const { houseId } = req.params;
    
    const stats = await paymentReminderService.getReminderStats(houseId);
    
    res.json({
      success: true,
      data: {
        houseId: parseInt(houseId),
        ...stats
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting house reminder stats:', error);
    next(error);
  }
};

/**
 * Start payment reminder worker (admin only)
 * POST /api/reminders/worker/start
 */
exports.startWorker = async (req, res, next) => {
  try {
    paymentReminderWorker.start();
    
    res.json({
      success: true,
      message: 'Payment reminder worker started',
      status: paymentReminderWorker.getStatus()
    });
    
  } catch (error) {
    console.error('❌ Error starting payment reminder worker:', error);
    next(error);
  }
};

/**
 * Stop payment reminder worker (admin only)
 * POST /api/reminders/worker/stop
 */
exports.stopWorker = async (req, res, next) => {
  try {
    paymentReminderWorker.stop();
    
    res.json({
      success: true,
      message: 'Payment reminder worker stopped',
      status: paymentReminderWorker.getStatus()
    });
    
  } catch (error) {
    console.error('❌ Error stopping payment reminder worker:', error);
    next(error);
  }
};

/**
 * Get worker status
 * GET /api/reminders/worker/status
 */
exports.getWorkerStatus = async (req, res, next) => {
  try {
    const status = paymentReminderWorker.getStatus();
    
    res.json({
      success: true,
      data: status
    });
    
  } catch (error) {
    console.error('❌ Error getting worker status:', error);
    next(error);
  }
};

/**
 * Reset worker statistics (admin only)
 * POST /api/reminders/worker/reset-stats
 */
exports.resetWorkerStats = async (req, res, next) => {
  try {
    paymentReminderWorker.resetStats();
    
    res.json({
      success: true,
      message: 'Worker statistics reset',
      status: paymentReminderWorker.getStatus()
    });
    
  } catch (error) {
    console.error('❌ Error resetting worker stats:', error);
    next(error);
  }
};

/**
 * Test payment reminder system (admin only)
 * POST /api/reminders/test
 */
exports.testReminders = async (req, res, next) => {
  try {
    const { type = 'all', userId, houseId } = req.body;
    
    let results = {};
    
    switch (type) {
      case 'advance':
        results = await paymentReminderService.sendAdvanceReminders();
        break;
      case 'overdue':
        results = await paymentReminderService.sendOverdueReminders();
        break;
      case 'roommate':
        results = await paymentReminderService.sendRoommateAlerts();
        break;
      default:
        results = await paymentReminderService.sendPaymentReminders();
    }
    
    res.json({
      success: true,
      message: `Test ${type} reminders completed`,
      results: {
        sent: results.sent || (results.advanceReminders + results.overdueReminders + results.roommateAlerts),
        errors: results.errors.length,
        details: results
      }
    });
    
  } catch (error) {
    console.error('❌ Error testing payment reminders:', error);
    next(error);
  }
};

/**
 * Get reminder configuration
 * GET /api/reminders/config
 */
exports.getConfig = async (req, res, next) => {
  try {
    res.json({
      success: true,
      data: {
        ...paymentReminderService.REMINDER_CONFIG,
        description: {
          ADVANCE_REMINDERS: 'Days before due date to send advance reminders',
          OVERDUE_REMINDERS: 'Days after due date to send overdue reminders',
          COOLDOWN_HOURS: 'Hours between same type of reminders to prevent spam'
        }
      }
    });
    
  } catch (error) {
    console.error('❌ Error getting reminder config:', error);
    next(error);
  }
}; 