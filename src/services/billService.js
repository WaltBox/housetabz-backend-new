// src/services/billService.js
const { HouseService, Bill, Charge, User, Notification } = require('../models');
const { Op } = require('sequelize');

/**
 * Service for handling bill generation and processing
 */
const billService = {
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
          const result = await createBillForFixedService(service);
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
  }
};

/**
 * Helper function to create a bill for a fixed recurring service
 */
async function createBillForFixedService(service) {
  const transaction = await require('../models').sequelize.transaction();
  
  try {
    // Set the due date to the service's dueDay in the current month
    const today = new Date();
    const dueDate = new Date(today.getFullYear(), today.getMonth(), service.dueDay || 1);
    
    // If dueDay has already passed this month, set due date to next month
    if (dueDate < today) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }
    
    // Create the bill using the fixed amount from the service
    const bill = await Bill.create({
      houseId: service.houseId,
      amount: service.amount,
      houseService_id: service.id,
      name: service.name,
      status: 'pending',
      dueDate,
      billType: 'fixed_recurring',
      metadata: {
        generatedAutomatically: true,
        generatedAt: new Date()
      }
    }, { transaction });
    
    // Find all users in the house to distribute charges
    const users = await User.findAll({
      where: { houseId: service.houseId }
    }, { transaction });
    
    if (!users.length) {
      throw new Error('No users found for this house');
    }
    
    // Calculate individual charge amount
    const chargeAmount = service.amount / users.length;
    
    // Create charges for each user
    const charges = [];
    for (const user of users) {
      const charge = await Charge.create({
        userId: user.id,
        billId: bill.id,
        amount: chargeAmount,
        name: service.name,
        status: 'unpaid',
        dueDate: bill.dueDate
      }, { transaction });
      
      charges.push(charge);
      
      // Create notification for each user
      await Notification.create({
        userId: user.id,
        message: `You have a new charge of $${chargeAmount.toFixed(2)} for ${service.name}.`,
        isRead: false,
        metadata: {
          type: 'new_charge',
          chargeId: charge.id,
          billId: bill.id,
          amount: chargeAmount,
          billType: 'fixed_recurring'
        }
      }, { transaction });
      
      // Update user balance
      user.balance = (parseFloat(user.balance || 0) + parseFloat(chargeAmount)).toFixed(2);
      await user.save({ transaction });
    }
    
    // Update house balance - ADD THIS CODE
    const house = await require('../models').House.findByPk(service.houseId, { transaction });
    if (house && house.balance !== undefined) {
      house.balance = (parseFloat(house.balance || 0) + parseFloat(service.amount)).toFixed(2);
      await house.save({ transaction });
    }
    
    await transaction.commit();
    
    return {
      bill,
      charges
    };
  } catch (error) {
    await transaction.rollback();
    console.error('Error creating bill for fixed service:', error);
    throw error;
  }
}

billService.createBillForFixedService = createBillForFixedService;
module.exports = billService;