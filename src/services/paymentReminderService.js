// src/services/paymentReminderService.js - Smart Payment Reminder System
const { Op } = require('sequelize');
const { User, Charge, Bill, House, Notification, UrgentMessage, sequelize } = require('../models');
const { sendPushNotification } = require('./pushNotificationService');
const urgentMessageService = require('./urgentMessageService');
const { canAdvanceCharge } = require('./advanceService');

// Reminder configuration
const REMINDER_CONFIG = {
  // Days before due date to send reminders
  ADVANCE_REMINDERS: [7, 3, 1], // 7 days, 3 days, 1 day before (skip 2 days)
  OVERDUE_REMINDERS: [1, 3, 7],    // 1 day, 3 days, 7 days after due
  
  // Cooldown periods (hours between same type of reminder)
  COOLDOWN_HOURS: {
    ADVANCE: 12,      // 12 hours between advance reminders
    OVERDUE: 6,       // 6 hours between overdue reminders  
    ROOMMATE: 24,     // 24 hours between roommate notifications
    ADVANCE_INSUFFICIENT: 6  // 6 hours between advance insufficient alerts
  },

  // Staggering configuration to prevent notification spam
  STAGGERING: {
    DELAY_BETWEEN_USERS: 2000,      // 2 seconds between users
    DELAY_BETWEEN_TYPES: 5000,      // 5 seconds between different reminder types
    DELAY_BETWEEN_CHARGES: 1000,    // 1 second between charges for same user
    MAX_BATCH_SIZE: 10              // Process max 10 notifications at once
  },

  // Message templates
  MESSAGES: {
    ADVANCE: {
      7: { 
        title: "Earn Points - Payment Due Next Week", 
        message: "🌟 Your charge for {billName} (${amount}) is due in 1 week. Pay now to earn additional points!" 
      },
      3: { 
        title: "Earn Points - Payment Due Soon", 
        message: "💎 Your charge for {billName} (${amount}) is due in 3 days. Pay now to earn additional points!" 
      },
      1: { 
        title: "Urgent: Payment Due Tomorrow", 
        message: "🚨 Urgent: Your charge for {billName} is due tomorrow. Pay now so your HSI is not affected!" 
      }
    },
    OVERDUE: {
      1: { 
        title: "Payment Past Due", 
        message: "🤔 Your {billName} payment of ${amount} was due yesterday. Your HSI might be affected - pay when you can!" 
      },
      3: { 
        title: "Payment Still Needed", 
        message: "😅 Your {billName} payment (${amount}) is 3 days overdue. Your house's HSI is being affected!" 
      },
      7: { 
        title: "Payment Really Needed", 
        message: "🙃 Your {billName} payment (${amount}) is 1 week overdue. Your house's HSI is taking a hit!" 
      }
    },
    ROOMMATE: {
      title: "Roommate Payment Alert",
      message: "🏠 {roommateNames} have missed payments. Remind them to pay because this can affect your house's HSI!"
    },
    ADVANCE_INSUFFICIENT: {
      title: "Payment Missing",
      message: "😬 Your house is missing payments HSI can't cover - {billName} needs ${shortfall} more"
    }
  }
};

/**
 * Utility function to add staggered delays between operations
 */
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Process items in batches with staggered delays
 */
async function processWithStaggering(items, processor, delayMs = REMINDER_CONFIG.STAGGERING.DELAY_BETWEEN_USERS) {
  const batchSize = REMINDER_CONFIG.STAGGERING.MAX_BATCH_SIZE;
  let processed = 0;
  
  for (let i = 0; i < items.length; i += batchSize) {
    const batch = items.slice(i, i + batchSize);
    
    for (const item of batch) {
      try {
        await processor(item);
        processed++;
        
        // Add delay between items (except for the last item)
        if (i + batch.indexOf(item) < items.length - 1) {
          await sleep(delayMs);
        }
      } catch (error) {
        console.error('Error processing item:', error);
      }
    }
    
    // Add longer delay between batches
    if (i + batchSize < items.length) {
      await sleep(delayMs * 2);
    }
  }
  
  return processed;
}

/**
 * Main function to check and send all payment reminders
 * @param {string} type - Type of reminders to send: 'personal', 'social', or 'all'
 */
async function sendPaymentReminders(type = 'all') {
  try {
    console.log(`🔔 Starting payment reminder check (${type})...`);
    
    const results = {
      advanceReminders: 0,
      overdueReminders: 0,
      roommateAlerts: 0,
      advanceInsufficientAlerts: 0,
      errors: []
    };

    if (type === 'personal' || type === 'all') {
      // Send personal notifications (user's own stuff)
      console.log('👤 Sending personal reminders...');
      const personalResults = await sendPersonalReminders();
      results.advanceReminders = personalResults.advanceReminders;
      results.overdueReminders = personalResults.overdueReminders;
      results.errors.push(...personalResults.errors);
    }

    if (type === 'social' || type === 'all') {
      // Wait between personal and social notifications
      if (type === 'all') {
        await sleep(REMINDER_CONFIG.STAGGERING.DELAY_BETWEEN_TYPES);
      }
      
      // Send social notifications (roommate stuff)
      console.log('🏠 Sending social reminders...');
      const socialResults = await sendSocialReminders();
      results.roommateAlerts = socialResults.roommateAlerts;
      results.advanceInsufficientAlerts = socialResults.advanceInsufficientAlerts;
      results.errors.push(...socialResults.errors);
    }

    console.log(`✅ Payment reminder check completed (${type}):`, results);
    return results;

  } catch (error) {
    console.error('❌ Error in payment reminder service:', error);
    throw error;
  }
}

/**
 * Send personal reminders (user's own payments and bills)
 */
async function sendPersonalReminders() {
  const results = {
    advanceReminders: 0,
    overdueReminders: 0,
    errors: []
  };

  try {
    // Send advance reminders (before due date)
    console.log('📅 Sending advance reminders...');
    const advanceResults = await sendAdvanceReminders();
    results.advanceReminders = advanceResults.sent;
    results.errors.push(...advanceResults.errors);

    // Wait before sending next type of reminders
    await sleep(REMINDER_CONFIG.STAGGERING.DELAY_BETWEEN_TYPES);

    // Send overdue reminders (after due date)
    console.log('⚠️ Sending overdue reminders...');
    const overdueResults = await sendOverdueReminders();
    results.overdueReminders = overdueResults.sent;
    results.errors.push(...overdueResults.errors);

    return results;
  } catch (error) {
    console.error('❌ Error in personal reminders:', error);
    results.errors.push({ type: 'personal_reminders_system', error: error.message });
    return results;
  }
}

/**
 * Send social reminders (roommate alerts and house-wide issues)
 */
async function sendSocialReminders() {
  const results = {
    roommateAlerts: 0,
    advanceInsufficientAlerts: 0,
    errors: []
  };

  try {
    // Send roommate alerts for late payments
    console.log('🏠 Sending roommate alerts...');
    const roommateResults = await sendRoommateAlerts();
    results.roommateAlerts = roommateResults.sent;
    results.errors.push(...roommateResults.errors);

    // Wait before sending next type of reminders
    await sleep(REMINDER_CONFIG.STAGGERING.DELAY_BETWEEN_TYPES);

    // Send advance insufficient alerts
    console.log('😬 Sending advance insufficient alerts...');
    const advanceInsufficientResults = await sendAdvanceInsufficientAlerts();
    results.advanceInsufficientAlerts = advanceInsufficientResults.sent;
    results.errors.push(...advanceInsufficientResults.errors);

    return results;
  } catch (error) {
    console.error('❌ Error in social reminders:', error);
    results.errors.push({ type: 'social_reminders_system', error: error.message });
    return results;
  }
}

/**
 * Send advance reminders for upcoming due dates
 */
async function sendAdvanceReminders() {
  const results = { sent: 0, errors: [] };
  
  try {
    for (const days of REMINDER_CONFIG.ADVANCE_REMINDERS) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() + days);
      targetDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);

      // Find charges due on target date that are unpaid
      const upcomingCharges = await Charge.findAll({
        where: {
          dueDate: {
            [Op.between]: [targetDate, endDate]
          },
          status: { [Op.ne]: 'paid' }
        },
        include: [
          {
            model: User,
            as: 'User',
            attributes: ['id', 'username', 'email']
          },
          {
            model: Bill,
            attributes: ['id', 'name', 'billType']
          }
        ]
      });

      // Use staggering to prevent notification spam
      const chargesNeedingReminders = [];
      for (const charge of upcomingCharges) {
        try {
          // Check if we've already sent this reminder recently
          const recentReminder = await checkRecentReminder(
            charge.userId, 
            'advance_reminder', 
            charge.id, 
            REMINDER_CONFIG.COOLDOWN_HOURS.ADVANCE
          );

          if (!recentReminder) {
            chargesNeedingReminders.push({ charge, days });
          }
        } catch (error) {
          console.error(`Error checking reminder for charge ${charge.id}:`, error);
          results.errors.push({
            type: 'advance_reminder_check',
            chargeId: charge.id,
            error: error.message
          });
        }
      }

      // Send reminders with staggering
      await processWithStaggering(chargesNeedingReminders, async ({ charge, days }) => {
        try {
          await sendAdvanceReminder(charge, days);
          results.sent++;
        } catch (error) {
          console.error(`Error sending advance reminder for charge ${charge.id}:`, error);
          results.errors.push({
            type: 'advance_reminder',
            chargeId: charge.id,
            error: error.message
          });
        }
      }, REMINDER_CONFIG.STAGGERING.DELAY_BETWEEN_USERS);
    }
  } catch (error) {
    console.error('Error in sendAdvanceReminders:', error);
    results.errors.push({
      type: 'advance_reminders_system',
      error: error.message
    });
  }

  return results;
}

/**
 * Send overdue reminders for past due charges
 */
async function sendOverdueReminders() {
  const results = { sent: 0, errors: [] };
  
  try {
    for (const days of REMINDER_CONFIG.OVERDUE_REMINDERS) {
      const targetDate = new Date();
      targetDate.setDate(targetDate.getDate() - days);
      targetDate.setHours(0, 0, 0, 0);
      
      const endDate = new Date(targetDate);
      endDate.setHours(23, 59, 59, 999);

      // Find charges that were due on target date and are still unpaid
      const overdueCharges = await Charge.findAll({
        where: {
          dueDate: {
            [Op.between]: [targetDate, endDate]
          },
          status: { [Op.ne]: 'paid' }
        },
        include: [
          {
            model: User,
            as: 'User',
            attributes: ['id', 'username', 'email']
          },
          {
            model: Bill,
            attributes: ['id', 'name', 'billType']
          }
        ]
      });

      // Use staggering to prevent notification spam
      const chargesNeedingReminders = [];
      for (const charge of overdueCharges) {
        try {
          // Check if we've already sent this reminder recently
          const recentReminder = await checkRecentReminder(
            charge.userId, 
            'overdue_reminder', 
            charge.id, 
            REMINDER_CONFIG.COOLDOWN_HOURS.OVERDUE
          );

          if (!recentReminder) {
            chargesNeedingReminders.push({ charge, days });
          }
        } catch (error) {
          console.error(`Error checking overdue reminder for charge ${charge.id}:`, error);
          results.errors.push({
            type: 'overdue_reminder_check',
            chargeId: charge.id,
            error: error.message
          });
        }
      }

      // Send reminders with staggering
      await processWithStaggering(chargesNeedingReminders, async ({ charge, days }) => {
        try {
          await sendOverdueReminder(charge, days);
          results.sent++;
        } catch (error) {
          console.error(`Error sending overdue reminder for charge ${charge.id}:`, error);
          results.errors.push({
            type: 'overdue_reminder',
            chargeId: charge.id,
            error: error.message
          });
        }
      }, REMINDER_CONFIG.STAGGERING.DELAY_BETWEEN_USERS);
    }
  } catch (error) {
    console.error('Error in sendOverdueReminders:', error);
    results.errors.push({
      type: 'overdue_reminders_system',
      error: error.message
    });
  }

  return results;
}

/**
 * Send roommate alerts when housemates are late on payments
 */
async function sendRoommateAlerts() {
  const results = { sent: 0, errors: [] };
  
  try {
    // Get all houses with overdue charges
    const housesWithOverdue = await House.findAll({
      include: [
        {
          model: User,
          as: 'users',
          include: [
            {
              model: Charge,
              as: 'charges',
              where: {
                status: { [Op.ne]: 'paid' },
                dueDate: { [Op.lt]: new Date() } // Overdue
              },
              required: false,
              include: [
                {
                  model: Bill,
                  attributes: ['id', 'name']
                }
              ]
            }
          ]
        }
      ]
    });

    for (const house of housesWithOverdue) {
      try {
        // Group users by payment status
        const overdueUsers = [];
        const currentUsers = [];
        
        for (const user of house.users) {
          const overdueCharges = user.charges.filter(charge => 
            charge.status !== 'paid' && new Date(charge.dueDate) < new Date()
          );
          
          if (overdueCharges.length > 0) {
            const totalOverdue = overdueCharges.reduce((sum, charge) => sum + parseFloat(charge.amount), 0);
            overdueUsers.push({
              user,
              overdueCharges,
              totalOverdue
            });
          } else {
            currentUsers.push(user);
          }
        }

        // Send alerts to current users about overdue roommates
        if (overdueUsers.length > 0 && currentUsers.length > 0) {
          const alertsToSend = [];
          
          for (const currentUser of currentUsers) {
            // Check cooldown for roommate alerts
            const recentAlert = await checkRecentReminder(
              currentUser.id, 
              'roommate_alert', 
              house.id, 
              REMINDER_CONFIG.COOLDOWN_HOURS.ROOMMATE
            );

            if (!recentAlert) {
              alertsToSend.push({ currentUser, overdueUsers, house });
            }
          }

          // Send alerts with staggering
          await processWithStaggering(alertsToSend, async ({ currentUser, overdueUsers, house }) => {
            try {
              await sendRoommateAlert(currentUser, overdueUsers, house);
              results.sent++;
            } catch (error) {
              console.error(`Error sending roommate alert to user ${currentUser.id}:`, error);
              results.errors.push({
                type: 'roommate_alert',
                userId: currentUser.id,
                houseId: house.id,
                error: error.message
              });
            }
          }, REMINDER_CONFIG.STAGGERING.DELAY_BETWEEN_USERS);
        }
      } catch (error) {
        console.error(`Error sending roommate alerts for house ${house.id}:`, error);
        results.errors.push({
          type: 'roommate_alert',
          houseId: house.id,
          error: error.message
        });
      }
    }
  } catch (error) {
    console.error('Error in sendRoommateAlerts:', error);
    results.errors.push({
      type: 'roommate_alerts_system',
      error: error.message
    });
  }

  return results;
}

/**
 * Send advance insufficient alerts when bills can't be fronted
 */
async function sendAdvanceInsufficientAlerts() {
  const results = { sent: 0, errors: [] };
  
  try {
    // Get all pending bills with unpaid charges
    const pendingBills = await Bill.findAll({
      where: { 
        status: { [Op.in]: ['pending', 'partial_paid'] },
        dueDate: { [Op.lte]: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000) } // Due within 2 days
      },
      include: [
        {
          model: House,
          attributes: ['id', 'name']
        },
        {
          model: Charge,
          where: { status: 'unpaid' },
          required: true, // Only bills with unpaid charges
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['id', 'username', 'email']
            }
          ]
        }
      ]
    });

    for (const bill of pendingBills) {
      try {
        // Calculate unpaid amount
        const unpaidCharges = bill.Charges || [];
        const unpaidAmount = unpaidCharges.reduce((sum, charge) => sum + parseFloat(charge.amount), 0);
        
        // Check if house can advance this amount
        const advanceCheck = await canAdvanceCharge(bill.houseId, unpaidAmount);
        
        if (!advanceCheck.allowed) {
          // Cannot advance - send alerts to all house members
          const shortfall = unpaidAmount - advanceCheck.remaining;
          
          // Get all users in this house
          const houseUsers = await User.findAll({
            where: { houseId: bill.houseId },
            attributes: ['id', 'username', 'email']
          });
          
          // Format unpaid user names
          const unpaidUsers = unpaidCharges.map(charge => charge.User.username);
          let unpaidNames;
          
          if (unpaidUsers.length === 1) {
            unpaidNames = unpaidUsers[0];
          } else if (unpaidUsers.length === 2) {
            unpaidNames = `${unpaidUsers[0]} and ${unpaidUsers[1]}`;
          } else {
            const firstNames = unpaidUsers.slice(0, -1).join(', ');
            const lastName = unpaidUsers[unpaidUsers.length - 1];
            unpaidNames = `${firstNames}, and ${lastName}`;
          }
          
          // Send notification to each house member with staggering
          const alertsToSend = [];
          
          for (const user of houseUsers) {
            // Check cooldown
            const recentAlert = await checkRecentReminder(
              user.id,
              'advance_insufficient',
              bill.id,
              REMINDER_CONFIG.COOLDOWN_HOURS.ADVANCE_INSUFFICIENT
            );
            
            if (!recentAlert) {
              alertsToSend.push({ user, bill, unpaidNames, shortfall });
            }
          }

          // Send alerts with staggering
          await processWithStaggering(alertsToSend, async ({ user, bill, unpaidNames, shortfall }) => {
            try {
              await sendAdvanceInsufficientAlert(user, bill, unpaidNames, shortfall);
              results.sent++;
            } catch (error) {
              console.error(`Error sending advance insufficient alert to user ${user.id}:`, error);
              results.errors.push({
                type: 'advance_insufficient_alert',
                userId: user.id,
                billId: bill.id,
                error: error.message
              });
            }
          }, REMINDER_CONFIG.STAGGERING.DELAY_BETWEEN_USERS);
        }
      } catch (error) {
        console.error(`Error checking advance insufficient for bill ${bill.id}:`, error);
        results.errors.push({
          type: 'advance_insufficient',
          billId: bill.id,
          error: error.message
        });
      }
    }
  } catch (error) {
    console.error('Error in sendAdvanceInsufficientAlerts:', error);
    results.errors.push({
      type: 'advance_insufficient_system',
      error: error.message
    });
  }

  return results;
}

/**
 * Send an advance reminder to a user
 */
async function sendAdvanceReminder(charge, daysUntilDue) {
  const template = REMINDER_CONFIG.MESSAGES.ADVANCE[daysUntilDue];
  
  const message = template.message
    .replace('{billName}', charge.Bill.name)
    .replace('{amount}', charge.amount)
    .replace('{days}', daysUntilDue);

  // Create notification
  const notification = await Notification.create({
    userId: charge.userId,
    title: template.title,
    message: message,
    isRead: false,
    metadata: {
      type: 'advance_reminder',
      chargeId: charge.id,
      billId: charge.billId,
      daysUntilDue: daysUntilDue,
      amount: charge.amount
    }
  });

  // Send push notification
  await sendPushNotification(charge.User, {
    title: template.title,
    message: message,
    data: {
      type: 'advance_reminder',
      chargeId: charge.id,
      billId: charge.billId,
      notificationId: notification.id,
      daysUntilDue: daysUntilDue
    }
  });

  console.log(`📅 Sent ${daysUntilDue}-day advance reminder to ${charge.User.username} for ${charge.Bill.name}`);
}

/**
 * Send an overdue reminder to a user
 */
async function sendOverdueReminder(charge, daysOverdue) {
  const template = REMINDER_CONFIG.MESSAGES.OVERDUE[daysOverdue];
  
  const message = template.message
    .replace('{billName}', charge.Bill.name)
    .replace('{amount}', charge.amount);

  // Create notification
  const notification = await Notification.create({
    userId: charge.userId,
    title: template.title,
    message: message,
    isRead: false,
    metadata: {
      type: 'overdue_reminder',
      chargeId: charge.id,
      billId: charge.billId,
      daysOverdue: daysOverdue,
      amount: charge.amount
    }
  });

  // Send push notification
  await sendPushNotification(charge.User, {
    title: template.title,
    message: message,
    data: {
      type: 'overdue_reminder',
      chargeId: charge.id,
      billId: charge.billId,
      notificationId: notification.id,
      daysOverdue: daysOverdue
    }
  });

  console.log(`⚠️ Sent ${daysOverdue}-day overdue reminder to ${charge.User.username} for ${charge.Bill.name}`);
}

/**
 * Send roommate alert about late payments
 */
async function sendRoommateAlert(currentUser, overdueUsers, house) {
  // Format roommate names according to user requirements
  const names = overdueUsers.map(ou => ou.user.username);
  let roommateNames;
  
  if (names.length === 1) {
    roommateNames = names[0];
  } else if (names.length === 2) {
    roommateNames = `${names[0]} and ${names[1]}`;
  } else {
    // For 3+ names: "Name1, Name2, and Name3"
    const firstNames = names.slice(0, -1).join(', ');
    const lastName = names[names.length - 1];
    roommateNames = `${firstNames}, and ${lastName}`;
  }
  
  // Construct message with proper grammar for singular/plural
  const verb = names.length === 1 ? 'has' : 'have';
  const message = `🏠 ${roommateNames} ${verb} missed payments. Remind them to pay before your HSI goes down.`;
  
  const template = REMINDER_CONFIG.MESSAGES.ROOMMATE;

  // Create notification
  const notification = await Notification.create({
    userId: currentUser.id,
    title: template.title,
    message: message,
    isRead: false,
    metadata: {
      type: 'roommate_alert',
      houseId: house.id,
      overdueUsers: overdueUsers.map(ou => ({
        userId: ou.user.id,
        username: ou.user.username,
        totalOverdue: ou.totalOverdue,
        chargeCount: ou.overdueCharges.length
      }))
    }
  });

  // Send push notification
  await sendPushNotification(currentUser, {
    title: template.title,
    message: message,
    data: {
      type: 'roommate_alert',
      houseId: house.id,
      notificationId: notification.id,
      overdueCount: overdueUsers.length
    }
  });

  console.log(`🏠 Sent roommate alert to ${currentUser.username} about ${roommateNames}`);
}

/**
 * Send advance insufficient alert to a user
 */
async function sendAdvanceInsufficientAlert(user, bill, unpaidNames, shortfall) {
  const template = REMINDER_CONFIG.MESSAGES.ADVANCE_INSUFFICIENT;
  const message = template.message
    .replace('{unpaidNames}', unpaidNames)
    .replace('{billName}', bill.name)
    .replace('{shortfall}', shortfall.toFixed(2));

  // Create notification
  const notification = await Notification.create({
    userId: user.id,
    title: template.title,
    message: message,
    isRead: false,
    metadata: {
      type: 'advance_insufficient',
      billId: bill.id,
      houseId: bill.houseId,
      unpaidNames: unpaidNames,
      shortfall: shortfall
    }
  });

  // Send push notification
  await sendPushNotification(user, {
    title: template.title,
    message: message,
    data: {
      type: 'advance_insufficient',
      billId: bill.id,
      houseId: bill.houseId,
      notificationId: notification.id,
      shortfall: shortfall
    }
  });

  console.log(`😬 Sent advance insufficient alert to ${user.username} about ${bill.name} (${unpaidNames})`);
}

/**
 * Check if a recent reminder was sent (cooldown check)
 */
async function checkRecentReminder(userId, reminderType, referenceId, cooldownHours) {
  const cooldownTime = new Date();
  cooldownTime.setHours(cooldownTime.getHours() - cooldownHours);

  const recentNotification = await Notification.findOne({
    where: {
      userId: userId,
      createdAt: { [Op.gt]: cooldownTime },
      metadata: {
        type: reminderType,
        [reminderType === 'roommate_alert' ? 'houseId' : 'chargeId']: referenceId
      }
    },
    order: [['createdAt', 'DESC']]
  });

  return recentNotification;
}

/**
 * Integration with urgent message system
 */
async function triggerUrgentMessageUpdates() {
  try {
    console.log('🔄 Triggering urgent message updates after reminders...');
    await urgentMessageService.refreshUrgentMessages();
    console.log('✅ Urgent message updates completed');
  } catch (error) {
    console.error('❌ Error updating urgent messages:', error);
  }
}

/**
 * Get reminder statistics for a house
 */
async function getReminderStats(houseId) {
  try {
    const users = await User.findAll({ where: { houseId } });
    const userIds = users.map(u => u.id);
    
    const [
      totalReminders,
      advanceReminders,
      overdueReminders,
      roommateAlerts
    ] = await Promise.all([
      Notification.count({
        where: {
          userId: { [Op.in]: userIds },
          metadata: {
            type: { [Op.in]: ['advance_reminder', 'overdue_reminder', 'roommate_alert'] }
          }
        }
      }),
      Notification.count({
        where: {
          userId: { [Op.in]: userIds },
          metadata: { type: 'advance_reminder' }
        }
      }),
      Notification.count({
        where: {
          userId: { [Op.in]: userIds },
          metadata: { type: 'overdue_reminder' }
        }
      }),
      Notification.count({
        where: {
          userId: { [Op.in]: userIds },
          metadata: { type: 'roommate_alert' }
        }
      })
    ]);

    return {
      totalReminders,
      advanceReminders,
      overdueReminders,
      roommateAlerts,
      lastReminderRun: new Date()
    };
  } catch (error) {
    console.error('Error getting reminder stats:', error);
    throw error;
  }
}

module.exports = {
  sendPaymentReminders,
  sendPersonalReminders,
  sendSocialReminders,
  sendAdvanceReminders,
  sendOverdueReminders,
  sendRoommateAlerts,
  sendAdvanceInsufficientAlerts,
  triggerUrgentMessageUpdates,
  getReminderStats,
  REMINDER_CONFIG
}; 