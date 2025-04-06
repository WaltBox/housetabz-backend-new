// src/services/billService.js
const { 
  HouseService, 
  Bill, 
  Charge, 
  User, 
  Notification, 
  BillSubmission, 
  HouseStatusIndex,
  sequelize 
} = require('../models');
const hsiService = require('./hsiService');
const financeService = require('./financeService');
const { Op } = require('sequelize');

/**
 * Core bill creation function - centralized logic for creating bills
 * @param {Object} params - Parameters for bill creation
 * @param {Object} params.service - The service object for which to create a bill
 * @param {number} [params.baseAmount] - Optional override for the bill amount (used for variable bills)
 * @param {Object} [params.transaction] - Optional existing transaction
 * @param {string} [params.createdBy] - Optional user ID who created the bill (for variable bills)
 * @param {Date} [params.customDueDate] - Optional custom due date
 * @returns {Promise<Object>} - Created bill and charges
 */
async function createBill(params) {
  const { 
    service, 
    baseAmount = service.amount, 
    transaction: existingTransaction, 
    createdBy = null,
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
      createdBy,
      metadata: {
        generatedAutomatically: !createdBy,
        generatedAt: new Date(),
        submittedByUserId: createdBy
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
    
    // Create notifications for each user
    const notificationData = users.map((user) => ({
      userId: user.id,
      message: `You have a new charge of $${(baseChargeAmount + chargeServiceFee).toFixed(2)} for ${service.name}.`,
      isRead: false,
      metadata: {
        type: 'new_charge',
        billId: bill.id,
        serviceId: service.id,
        amount: baseChargeAmount + chargeServiceFee
      }
    }));
    
    await Notification.bulkCreate(notificationData, { transaction });
    
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
      charges: createdCharges
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
      createdBy: userId,
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
        
        // Create a notification for the designated user
        try {
          const notification = await Notification.create({
            userId: service.designatedUser.id,
            message: `It's time to enter the bill amount for ${service.name}. Please login to your service provider account and enter the current bill amount.`,
            isRead: false,
            metadata: {
              type: 'variable_bill_reminder',
              serviceId: service.id,
              serviceName: service.name,
              dueDay: service.dueDay
            }
          });
          
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
          
          // Create a notification for the designated user
          await Notification.create({
            userId: service.designatedUser.id,
            message: `Please submit the ${service.name} bill amount for this month`,
            isRead: false,
            metadata: {
              type: 'bill_submission',
              billSubmissionId: submission.id,
              serviceId: service.id
            }
          });
          
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
          // Create a reminder notification
          const daysUntilDue = Math.round(
            (submission.dueDate - new Date()) / (24 * 60 * 60 * 1000)
          );
          
          const message = daysUntilDue <= 1
            ? `URGENT: Please submit the ${submission.houseService.name} bill amount today!`
            : `Reminder: Please submit the ${submission.houseService.name} bill amount soon. It's due in ${daysUntilDue} days.`;
          
          await Notification.create({
            userId: submission.userId,
            message,
            isRead: false,
            metadata: {
              type: 'bill_submission_reminder',
              billSubmissionId: submission.id,
              serviceId: submission.houseServiceId,
              daysUntilDue
            }
          });
          
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
  }
};

module.exports = {
  createBill,                  // expose the core function
  ...billService               // spread in the rest of your helpers
};