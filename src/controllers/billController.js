// src/controllers/billController.js
const { 
  Bill, 
  Charge, 
  User, 
  House, 
  HouseService, 
  Notification, 
  HouseStatusIndex,
  UserFinance,
  HouseFinance,
  sequelize 
} = require('../models');
const billService = require('../services/billService');
const { Op } = require('sequelize');
const { createLogger } = require('../utils/logger');

const logger = createLogger('bill-controller');

exports.createBill = async (req, res, next) => {
  const { houseId }       = req.params;
  const { amount, houseServiceId, billType, dueDate } = req.body;

  // Basic payload validation
  if (!houseServiceId) {
    return res.status(400).json({ error: 'houseServiceId is required' });
  }
  if (amount == null || isNaN(amount) || amount < 0) {
    return res.status(400).json({ error: 'A valid amount is required' });
  }

  try {
    // Fetch and verify the service belongs to this house
    const houseService = await HouseService.findByPk(houseServiceId);
    if (!houseService || String(houseService.houseId) !== houseId) {
      return res.status(404).json({ error: 'HouseService not found for this house' });
    }

    // Start a transaction
    const transaction = await sequelize.transaction();
    try {
      // Centralized creation logic
      const result = await billService.createBill({
        service:      houseService,
        baseAmount:   amount,
        transaction,
        customDueDate: dueDate ? new Date(dueDate) : null,
        billType      // if your service supports custom types
      });

      await transaction.commit();
      return res.status(201).json({
        message: 'Bill, charges, and notifications created successfully',
        bill:    result.bill,
        charges: result.charges
      });
    } catch (err) {
      await transaction.rollback();
      logger.error('Error in transaction:', err);
      throw err;
    }
  } catch (err) {
    logger.error('Error creating bill:', err);
    next(err);
  }
};

exports.getBillsForHouse = async (req, res, next) => {
  try {
    const { houseId } = req.params;
    const { billType } = req.query;

    // Authorization check: Ensure user belongs to this house
    if (req.user.houseId != houseId) {
      return res.status(403).json({ error: 'Unauthorized access to house bills' });
    }

    const house = await House.findByPk(houseId);
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    const whereCondition = { houseId };
    if (billType) {
      whereCondition.billType = billType;
    }

    const bills = await Bill.findAll({
      where: whereCondition,
      attributes: ['id', 'name', 'amount', 'status', 'billType', 'dueDate', 'createdAt'],
      include: [
        {
          model: Charge,
          attributes: ['id', 'amount', 'status', 'name', 'userId'],
          include: [
            {
              model: User,
              attributes: ['id', 'username'],
            },
          ],
        },
        {
          model: HouseService,
          as: 'houseService',
          attributes: ['id', 'name', 'type']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get the house finance info to include the balance
    const houseFinance = await HouseFinance.findOne({
      where: { houseId }
    });

    res.status(200).json({
      bills,
      houseBalance: houseFinance ? houseFinance.balance : 0
    });
  } catch (error) {
    logger.error('Error fetching bills for house:', error);
    next(error);
  }
};

exports.getPaidBillsForHouse = async (req, res) => {
  try {
    const { houseId } = req.params;
    
    // Authorization check: Ensure user belongs to this house
    if (req.user.houseId != houseId) {
      return res.status(403).json({ error: 'Unauthorized access to house bills' });
    }
    
    // Only include bills that have a status of 'paid'
    const bills = await Bill.findAll({
      where: {
        houseId,
        status: 'paid'
      }
    });

    if (!bills || bills.length === 0) {
      return res.status(404).json({ message: 'No paid bills found for this house' });
    }

    res.status(200).json(bills);
  } catch (error) {
    console.error('Error fetching paid bills for house:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

exports.getBillForHouse = async (req, res, next) => {
  try {
    const { houseId, billId } = req.params;

    // Authorization check: Ensure user belongs to this house
    if (req.user.houseId != houseId) {
      return res.status(403).json({ error: 'Unauthorized access to house bill' });
    }

    const house = await House.findByPk(houseId);
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    const bill = await Bill.findOne({
      where: { id: billId, houseId },
      attributes: ['id', 'name', 'amount', 'status', 'billType', 'dueDate', 'createdAt'],
      include: [
        {
          model: Charge,
          attributes: ['id', 'amount', 'status', 'name', 'userId'],
          include: [
            {
              model: User,
              attributes: ['id', 'username'],
            },
          ],
        },
        {
          model: HouseService,
          as: 'houseService',
          attributes: ['id', 'name', 'type']
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username']
        }
      ],
    });

    if (!bill) {
      return res.status(404).json({ message: 'Bill not found for this house' });
    }

    res.status(200).json(bill);
  } catch (error) {
    logger.error('Error fetching bill for house:', error);
    next(error);
  }
};

exports.generateFixedBills = async (req, res, next) => {
  try {
    const { houseId } = req.params;
    
    // Admin operation - check for admin role or house ownership
    // For specific house, user must belong to that house
    if (houseId !== '0' && req.user.houseId != houseId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to generate bills for this house' });
    }
    
    // For all houses, user must be admin
    if (houseId === '0' && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Only administrators can generate bills for all houses' });
    }
    
    let result;
    if (houseId === '0') {
      // Generate bills for all houses
      result = await billService.generateFixedRecurringBills();
    } else {
      // Generate bills for a specific house
      const services = await HouseService.findAll({
        where: {
          houseId,
          status: 'active',
          type: 'fixed_recurring'
        }
      });
      
      const results = [];
      for (const service of services) {
        try {
          // Use the refactored service function
          const billResult = await billService.createBillForFixedService(service);
          results.push({
            serviceId: service.id,
            serviceName: service.name,
            billId: billResult?.bill?.id || null,
            amount: billResult?.bill?.amount || null,
            success: true
          });
        } catch (error) {
          logger.error(`Error creating bill for service ${service.id}:`, error);
          results.push({
            serviceId: service.id,
            serviceName: service.name,
            success: false,
            error: error.message
          });
        }
      }
      
      result = {
        processedCount: services.length,
        successCount: results.filter(r => r.success).length,
        failureCount: results.filter(r => !r.success).length,
        results
      };
    }
    
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error generating fixed bills:', error);
    res.status(500).json({ 
      error: 'Failed to generate fixed bills',
      details: error.message
    });
  }
};

exports.submitVariableBillAmount = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { amount, userId } = req.body;
    
    // Authorization check: Ensure the authenticated user matches the userId being passed
    if (req.user.id != userId) {
      return res.status(403).json({ error: 'Unauthorized to submit bill on behalf of another user' });
    }
    
    if (!serviceId || !amount || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const service = await HouseService.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    // Authorization check: Ensure user belongs to the house this service is for
    if (req.user.houseId != service.houseId) {
      return res.status(403).json({ error: 'Service does not belong to your house' });
    }
    
    if (service.type !== 'variable_recurring') {
      return res.status(400).json({ error: 'Service is not a variable recurring service' });
    }
    
    if (service.designatedUserId && service.designatedUserId !== parseInt(userId)) {
      return res.status(403).json({ 
        error: 'Only the designated user can submit bill amounts for this service' 
      });
    }

    const transaction = await sequelize.transaction();
    
    try {
      // Use the refactored service for variable bill creation
      const result = await billService.createBillForVariableService(
        service,
        amount,
        userId,
        transaction
      );
      
      await transaction.commit();
      
      return res.status(201).json({
        message: 'Variable bill created successfully',
        bill: result.bill,
        charges: result.charges
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    logger.error('Error submitting variable bill amount:', error);
    res.status(500).json({ 
      error: 'Failed to submit variable bill amount',
      details: error.message
    });
  }
};

exports.generateVariableReminders = async (req, res) => {
  try {
    // Admin operation - check for admin role
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only administrators can generate variable reminders' });
    }
    
    const result = await billService.generateVariableServiceReminders();
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error generating variable service reminders:', error);
    res.status(500).json({ 
      error: 'Failed to generate variable service reminders',
      details: error.message
    });
  }
};

exports.getUserVariableServices = async (req, res) => {
  try {
    const { userId } = req.query;
    
    // Authorization check: Ensure the authenticated user matches the requested userId
    if (req.user.id != userId) {
      return res.status(403).json({ error: 'Unauthorized access to user services' });
    }
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing required userId parameter' });
    }
    
    const services = await HouseService.findAll({
      where: {
        type: 'variable_recurring',
        designatedUserId: userId,
        status: 'active'
      },
      include: [{
        model: User,
        as: 'designatedUser',
        attributes: ['id', 'username', 'email']
      }]
    });
    
    const today = new Date();
    const firstDayOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    
    const servicesWithBillStatus = await Promise.all(services.map(async (service) => {
      const existingBill = await Bill.findOne({
        where: {
          houseService_id: service.id,
          billType: 'variable_recurring',
          createdAt: {
            [Op.gte]: firstDayOfMonth
          }
        }
      });
      
      return {
        ...service.toJSON(),
        hasBillThisMonth: !!existingBill,
        currentBill: existingBill ? {
          id: existingBill.id,
          amount: existingBill.amount,
          status: existingBill.status,
          dueDate: existingBill.dueDate
        } : null
      };
    }));
    
    res.status(200).json({
      message: 'Variable services retrieved successfully',
      services: servicesWithBillStatus
    });
  } catch (error) {
    logger.error('Error fetching user variable services:', error);
    res.status(500).json({ 
      error: 'Failed to fetch variable services',
      details: error.message
    });
  }
};

module.exports = exports;