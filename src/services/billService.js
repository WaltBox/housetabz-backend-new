// src/services/billService.js
const { 
  HouseService, 
  Bill, 
  Charge, 
  User, 
  Notification, 
  BillSubmission, 
  HouseStatusIndex,
  DeviceToken,
  sequelize 
} = require('../models');
const hsiService = require('./hsiService');
const financeService = require('./financeService');
const pushNotificationService = require('./pushNotificationService');
const { Op } = require('sequelize');

/**
 * Core bill creation function - centralized logic for creating bills
 * @param {Object} params - Parameters for bill creation
 * @param {Object} params.service - The service object for which to create a bill
 * @param {number} [params.baseAmount] - Optional override for the bill amount (used for variable bills)
 * @param {Object} [params.transaction] - Optional existing transaction
 * @param {Date} [params.customDueDate] - Optional custom due date
 * @returns {Promise<Object>} - Created bill and charges
 */
async function createBill(params) {
  const { 
    service, 
    baseAmount = service.amount, 
    transaction: existingTransaction, 
    customDueDate = null 
  } = params;
  
  // Determine if we need to manage our own transaction
  const useExistingTransaction = !!existingTransaction;
  const transaction = existingTransaction || await sequelize.transaction();
  
  try {
    // Set the due date to the service's dueDay in the current month
    const today = new Date();
    let dueDate = customDueDate;
    
    if (!dueDate) {
      dueDate = new Date(today.getFullYear(), today.getMonth(), service.dueDay || 1);
      // If dueDay has already passed this month, set due date to next month
      if (dueDate < today) {
        dueDate.setMonth(dueDate.getMonth() + 1);
      }
    }
    
    // Find all users in the house to distribute charges
    const users = await User.findAll({
      where: { houseId: service.houseId }
    }, { transaction });
    
    if (!users.length) {
      throw new Error('No users found for this house');
    }
    
    const numberOfUsers = users.length;
    const parsedBaseAmount = parseFloat(baseAmount);
    
    // Retrieve the current HouseStatusIndex for the house
    const houseStatus = await HouseStatusIndex.findOne({
      where: { houseId: service.houseId },
      order: [['updatedAt', 'DESC']]
    }, { transaction });
    
    const hsiScore = houseStatus ? houseStatus.score : 50;
    
    // Calculate the base service fee per user based on fee category
    const baseServiceFeeRate = service.feeCategory === 'card' ? 2.00 : 0.00;
    const totalBaseServiceFee = numberOfUsers * baseServiceFeeRate;
    
    // Use the existing HSI service to calculate the fee multiplier
    const feeMultiplier = hsiService.calculateFeeMultiplier(hsiScore);
    
    // Calculate the total service fee with HSI adjustment
    const totalServiceFee = parseFloat((totalBaseServiceFee * feeMultiplier).toFixed(2));
    
    // Calculate the total bill amount including service fees
    const totalAmount = parseFloat((parsedBaseAmount + totalServiceFee).toFixed(2));
    
    // Set the bill type based on the service type
    let billType;
    if (service.type === 'fixed_recurring') {
      billType = 'fixed_recurring';
    } else if (service.type === 'variable_recurring') {
      billType = 'variable_recurring';
    } else {
      billType = 'regular';
    }
    
    // Create the bill with the calculated amounts
    const bill = await Bill.create({
      houseId: service.houseId,
      baseAmount: parsedBaseAmount,
      serviceFeeTotal: totalServiceFee,
      amount: totalAmount,
      houseService_id: service.id,
      name: service.name,
      status: 'pending',
      dueDate,
      billType,
      metadata: {
        generatedAt: new Date(),
      }
    }, { transaction });
    
    // Calculate each user's portion
    const baseChargeAmount = parseFloat((parsedBaseAmount / numberOfUsers).toFixed(2));
    const chargeServiceFee = parseFloat((totalServiceFee / numberOfUsers).toFixed(2));
    
    // Create charge data for each user
    const chargeData = users.map((user) => ({
      userId: user.id,
      billId: bill.id,
      baseAmount: baseChargeAmount,
      serviceFee: chargeServiceFee,
      amount: parseFloat((baseChargeAmount + chargeServiceFee).toFixed(2)),
      name: service.name,
      status: 'unpaid',
      dueDate: bill.dueDate,
      hsiAtTimeOfCharge: hsiScore,
      pointsPotential: 2,
      metadata: {
        billType,
        baseServiceFee: baseServiceFeeRate,
        adjustedServiceFee: chargeServiceFee,
        feeMultiplier: feeMultiplier
      }
    }));
    
    // Create all charges using bulkCreate for efficiency
    const createdCharges = await Charge.bulkCreate(chargeData, { transaction });
    
    // Create notifications for each user and send push notifications
    const notificationPromises = users.map(async (user) => {
      const userCharge = createdCharges.find(charge => charge.userId === user.id);
      const chargeAmount = (baseChargeAmount + chargeServiceFee).toFixed(2);
      const notificationMessage = `You have a new charge of $${chargeAmount} for ${service.name}.`;
      
      // Create database notification
      const notification = await Notification.create({
        userId: user.id,
        message: notificationMessage,
        isRead: false,
        metadata: {
          type: 'new_charge',
          billId: bill.id,
          serviceId: service.id,
          amount: baseChargeAmount + chargeServiceFee
        }
      }, { transaction });
      
      // Send push notification after transaction commits to ensure DB consistency
      if (!useExistingTransaction) {
        transaction.afterCommit(async () => {
          try {
            await pushNotificationService.sendPushNotification(user, {
              title: 'New Charge',
              message: notificationMessage,
              data: {
                type: 'new_charge',
                billId: bill.id,
                serviceId: service.id,
                notificationId: notification.id
              }
            });
          } catch (error) {
            console.error(`Error sending push notification to user ${user.id}:`, error);
          }
        });
      }
      
      return notification;
    });
    
    const notifications = await Promise.all(notificationPromises);
    
    // Update user balances using the finance service
    for (const user of users) {
      const userCharge = createdCharges.find(charge => charge.userId === user.id);
      if (userCharge) {
        await financeService.addUserCharge(
          user.id,
          userCharge.amount,
          `${billType} charge for ${service.name}`,
          transaction,
          {
            billId: bill.id,
            chargeId: userCharge.id,
            billType
          }
        );
      }
    }
    
    // Update house balance with total amount
    await financeService.updateHouseBalance(
      service.houseId,
      totalAmount,
      'CHARGE',
      `${billType} bill: ${service.name}`,
      transaction,
      {
        billId: bill.id,
        billType,
        serviceId: service.id
      }
    );
    
    // Commit transaction if we started it
    if (!useExistingTransaction) {
      await transaction.commit();
    }
    
    return {
      bill,
      charges: createdCharges,
      notifications
    };
  } catch (error) {
    // Only rollback if we started the transaction
    if (!useExistingTransaction) {
      await transaction.rollback();
    }
    console.error('Error creating bill:', error);
    throw error;
  }
}

/**
 * Helper function to send both database and push notifications
 * @param {Object} user - User to send notification to
 * @param {string} message - Notification message
 * @param {Object} metadata - Notification metadata
 * @param {string} pushTitle - Push notification title
 * @param {Object} transaction - Optional transaction
 */
async function sendNotification(user, message, metadata, pushTitle, transaction = null) {
  try {
    // Create database notification
    const notification = await Notification.create({
      userId: user.id,
      message,
      isRead: false,
      metadata
    }, { transaction });
    
    // Send push notification - outside of transaction to avoid rollback issues
    try {
      await pushNotificationService.sendPushNotification(user, {
        title: pushTitle,
        message,
        data: {
          ...metadata,
          notificationId: notification.id
        }
      });
    } catch (error) {
      console.error(`Error sending push notification to user ${user.id}:`, error);
    }
    
    return notification;
  } catch (error) {
    console.error(`Error creating notification for user ${user.id}:`, error);
    throw error;
  }
}

/**
 * Service for handling bill generation and processing
 */
const billService = {
  /**
   * Create a bill for a fixed recurring service
   * Used by both the scheduler and manual API triggers
   */
  async createBillForFixedService(service, transaction = null) {
    return createBill({
      service,
      transaction
    });
  },
  
  /**
   * Create a bill for a variable recurring service
   * Used when submitting variable bill amounts
   */
  async createBillForVariableService(service, amount, userId, transaction = null) {
    return createBill({
      service,
      baseAmount: amount,
      transaction
    });
  },
  
  /**
   * Generate bills for all active fixed recurring services
   * Should be called by a scheduler daily
   */
  async generateFixedRecurringBills() {
    try {
      const today = new Date();
      const currentDay = today.getDate();
      
      // Find all active fixed recurring services where createDay matches today
      const services = await HouseService.findAll({
        where: {
          status: 'active',
          type: 'fixed_recurring',
          createDay: currentDay
        },
      });
      
      console.log(`Found ${services.length} fixed recurring services for bill generation`);
      
      const results = [];
      
      // Process each service
      for (const service of services) {
        // Check if a bill already exists for this month
        const existingBill = await Bill.findOne({
          where: {
            houseService_id: service.id,
            billType: 'fixed_recurring',
            createdAt: {
              [Op.gte]: new Date(today.getFullYear(), today.getMonth(), 1)
            }
          }
        });
        
        if (existingBill) {
          console.log(`Bill already exists for service ${service.id} this month, skipping`);
          results.push({
            serviceId: service.id,
            serviceName: service.name,
            billId: existingBill.id,
            success: true,
            message: 'Bill already exists'
          });
          continue;
        }
        
        // Create the bill
        try {
          const result = await this.createBillForFixedService(service);
          results.push({
            serviceId: service.id,
            serviceName: service.name,
            billId: result.bill.id,
            amount: result.bill.amount,
            success: true
          });
        } catch (error) {
          console.error(`Error creating bill for service ${service.id}:`, error);
          results.push({
            serviceId: service.id,
            serviceName: service.name,
            success: false,
            error: error.message
          });
        }
      }
      
      return {
        processedCount: services.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      console.error('Error generating fixed recurring bills:', error);
      throw error;
    }
  },
  
  /**
   * Generate reminders for variable recurring services
   * Should be called by a scheduler daily
   */
  async generateVariableServiceReminders() {
    try {
      const today = new Date();
      
      // Find all active variable recurring services where today is the due day
      const services = await HouseService.findAll({
        where: {
          status: 'active',
          type: 'variable_recurring',
          dueDay: today.getDate()
        },
        include: [{
          model: User,
          as: 'designatedUser',
          attributes: ['id', 'username', 'email']
        }]
      });
      
      console.log(`Found ${services.length} variable recurring services for reminders`);
      
      const results = [];
      
      // Process each service
      for (const service of services) {
        if (!service.designatedUser) {
          console.log(`Service ${service.id} has no designated user, skipping`);
          results.push({
            serviceId: service.id,
            serviceName: service.name,
            success: false,
            error: 'No designated user'
          });
          continue;
        }
        
        // Check if a bill already exists for this month
        const existingBill = await Bill.findOne({
          where: {
            houseService_id: service.id,
            billType: 'variable_recurring',
            createdAt: {
              [Op.gte]: new Date(today.getFullYear(), today.getMonth(), 1)
            }
          }
        });
        
        if (existingBill) {
          console.log(`Bill already exists for service ${service.id} this month, skipping reminder`);
          results.push({
            serviceId: service.id,
            serviceName: service.name,
            billId: existingBill.id,
            success: true,
            message: 'Bill already exists'
          });
          continue;
        }
        
        // Create notifications for the designated user
        try {
          const message = `It's time to enter the bill amount for ${service.name}. Please login to your service provider account and enter the current bill amount.`;
          const metadata = {
            type: 'variable_bill_reminder',
            serviceId: service.id,
            serviceName: service.name,
            dueDay: service.dueDay
          };
          
          const notification = await sendNotification(
            service.designatedUser,
            message,
            metadata,
            'Bill Entry Reminder'
          );
          
          results.push({
            serviceId: service.id,
            serviceName: service.name,
            notificationId: notification.id,
            success: true
          });
        } catch (error) {
          console.error(`Error creating notification for service ${service.id}:`, error);
          results.push({
            serviceId: service.id,
            serviceName: service.name,
            success: false,
            error: error.message
          });
        }
      }
      
      return {
        processedCount: services.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      console.error('Error generating variable service reminders:', error);
      throw error;
    }
  },
  
  /**
   * Generate bill submission requests for variable services
   * Should be called by the scheduler on reminderDay
   */
  async generateVariableBillSubmissionRequests() {
    try {
      const today = new Date();
      const currentDay = today.getDate();
      
      // Find all active variable recurring services where reminderDay matches today
      const services = await HouseService.findAll({
        where: {
          status: 'active',
          type: 'variable_recurring',
          reminderDay: currentDay
        },
        include: [{
          model: User,
          as: 'designatedUser',
          attributes: ['id', 'username', 'email']
        }]
      });
      
      console.log(`Found ${services.length} variable recurring services for bill submission requests`);
      
      const results = [];
      
      // Process each service
      for (const service of services) {
        if (!service.designatedUser) {
          console.log(`Service ${service.id} has no designated user, skipping`);
          results.push({
            serviceId: service.id,
            serviceName: service.name,
            success: false,
            error: 'No designated user'
          });
          continue;
        }
        
        // Check if a bill submission already exists for this month
        const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const existingSubmission = await BillSubmission.findOne({
          where: {
            houseServiceId: service.id,
            createdAt: {
              [Op.gte]: firstDayOfMonth
            }
          }
        });
        
        if (existingSubmission) {
          console.log(`Bill submission already exists for service ${service.id} this month, skipping`);
          results.push({
            serviceId: service.id,
            serviceName: service.name,
            submissionId: existingSubmission.id,
            success: true,
            message: 'Submission already exists'
          });
          continue;
        }
        
        // Check if a bill already exists for this month
        const existingBill = await Bill.findOne({
          where: {
            houseService_id: service.id,
            billType: 'variable_recurring',
            createdAt: {
              [Op.gte]: firstDayOfMonth
            }
          }
        });
        
        if (existingBill) {
          console.log(`Bill already exists for service ${service.id} this month, skipping submission request`);
          results.push({
            serviceId: service.id,
            serviceName: service.name,
            billId: existingBill.id,
            success: true,
            message: 'Bill already exists'
          });
          continue;
        }
        
        // Calculate the due date
        const dueDate = new Date(today.getFullYear(), today.getMonth(), service.dueDay || 1);
        if (dueDate < today) {
          dueDate.setMonth(dueDate.getMonth() + 1);
        }
        
        // Create the bill submission request
        try {
          const submission = await BillSubmission.create({
            houseServiceId: service.id,
            userId: service.designatedUser.id,
            status: 'pending',
            dueDate,
            metadata: {
              serviceName: service.name,
              month: today.getMonth() + 1,
              year: today.getFullYear()
            }
          });
          
          // Create notifications for the designated user
          const message = `Please submit the ${service.name} bill amount for this month`;
          const metadata = {
            type: 'bill_submission',
            billSubmissionId: submission.id,
            serviceId: service.id
          };
          
          const notification = await sendNotification(
            service.designatedUser,
            message,
            metadata,
            'Bill Submission Required'
          );
          
          results.push({
            serviceId: service.id,
            serviceName: service.name,
            submissionId: submission.id,
            success: true
          });
        } catch (error) {
          console.error(`Error creating bill submission for service ${service.id}:`, error);
          results.push({
            serviceId: service.id,
            serviceName: service.name,
            success: false,
            error: error.message
          });
        }
      }
      
      return {
        processedCount: services.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        results
      };
    } catch (error) {
      console.error('Error generating bill submission requests:', error);
      throw error;
    }
  },
  
  /**
   * Generate reminders for pending bill submissions
   * Should be called by a scheduler daily
   */
  async generateBillSubmissionReminders() {
    try {
      // Find pending submissions that are due within 7 days
      const pendingSubmissions = await BillSubmission.findAll({
        where: { 
          status: 'pending',
          dueDate: {
            [Op.lte]: new Date(new Date().getTime() + (7 * 24 * 60 * 60 * 1000)) // Due within 7 days
          }
        },
        include: [
          { model: HouseService, as: 'houseService' },
          { model: User, as: 'user' }
        ]
      });
      
      console.log(`Found ${pendingSubmissions.length} pending submissions due soon`);
      
      const results = [];
      
      for (const submission of pendingSubmissions) {
        // Check if a reminder notification was already sent in the last 24 hours
        const recentNotification = await Notification.findOne({
          where: {
            userId: submission.userId,
            createdAt: {
              [Op.gte]: new Date(new Date().getTime() - (24 * 60 * 60 * 1000))
            },
            metadata: {
              type: 'bill_submission_reminder',
              billSubmissionId: submission.id
            }
          }
        });
        
        if (!recentNotification) {
          // Calculate days until due
          const daysUntilDue = Math.round(
            (submission.dueDate - new Date()) / (24 * 60 * 60 * 1000)
          );
          
          // Create reminder notification with appropriate urgency
          const message = daysUntilDue <= 1
            ? `URGENT: Please submit the ${submission.houseService.name} bill amount today!`
            : `Reminder: Please submit the ${submission.houseService.name} bill amount soon. It's due in ${daysUntilDue} days.`;
          
          const metadata = {
            type: 'bill_submission_reminder',
            billSubmissionId: submission.id,
            serviceId: submission.houseServiceId,
            daysUntilDue
          };
          
          // Determine push title based on urgency
          const pushTitle = daysUntilDue <= 1 ? 'URGENT: Bill Submission' : 'Bill Submission Reminder';
          
          await sendNotification(
            submission.user,
            message,
            metadata,
            pushTitle
          );
          
          results.push({
            submissionId: submission.id,
            serviceName: submission.houseService.name,
            userId: submission.userId,
            username: submission.user.username,
            daysUntilDue,
            reminderSent: true
          });
          
          console.log(`Sent reminder for submission ${submission.id} to user ${submission.userId}`);
        } else {
          results.push({
            submissionId: submission.id,
            serviceName: submission.houseService.name,
            userId: submission.userId,
            username: submission.user.username,
            reminderSent: false,
            reason: 'Recent reminder already sent'
          });
        }
      }
      
      return {
        processedCount: pendingSubmissions.length,
        remindersSent: results.filter(r => r.reminderSent).length,
        totalChecked: results.length,
        results
      };
    } catch (error) {
      console.error('Error generating bill submission reminders:', error);
      throw error;
    }
  },
  
  /**
   * Send notification to users for a specific bill
   * @param {number} billId - ID of the bill
   * @param {string} message - Message to send
   * @param {string} title - Title for push notification
   */
  async sendBillNotifications(billId, message, title) {
    try {
      const bill = await Bill.findByPk(billId, {
        include: [
          {
            model: Charge,
            as: 'charges',
            include: [
              {
                model: User,
                as: 'user',
                attributes: ['id', 'username', 'email']
              }
            ]
          }
        ]
      });
      
      if (!bill) {
        throw new Error(`Bill with ID ${billId} not found`);
      }
      
      const notifications = [];
      
      // Send notifications to all users with charges for this bill
      for (const charge of bill.charges) {
        const metadata = {
          type: 'bill_notification',
          billId: bill.id,
          chargeId: charge.id,
          amount: charge.amount
        };
        
        const notification = await sendNotification(
          charge.user,
          message,
          metadata,
          title
        );
        
        notifications.push(notification);
      }
      
      return notifications;
    } catch (error) {
      console.error(`Error sending bill notifications for bill ${billId}:`, error);
      throw error;
    }
  }
};

module.exports = {
  createBill,                  // expose the core function
  sendNotification,            // expose the notification helper
  ...billService               // spread in the rest of your helpers
};