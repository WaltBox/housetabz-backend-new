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
const { canAdvanceCharge } = require('../services/advanceService'); // ← Import advance service
const { Op } = require('sequelize');
const { createLogger } = require('../utils/logger');
const logger = createLogger('bill-controller');

/**
 * Create a new bill along with charges and notifications.
 * The billService handles both in-app and push notifications.
 */
exports.createBill = async (req, res, next) => {
  const { houseId } = req.params;
  const { amount, houseServiceId, billType, dueDate } = req.body;

  if (!houseServiceId) {
    return res.status(400).json({ error: 'houseServiceId is required' });
  }
  if (amount == null || isNaN(amount) || amount < 0) {
    return res.status(400).json({ error: 'A valid amount is required' });
  }

  try {
    // Verify that the service belongs to the specified house
    const houseService = await HouseService.findByPk(houseServiceId);
    if (!houseService || String(houseService.houseId) !== houseId) {
      return res.status(404).json({ error: 'HouseService not found for this house' });
    }

    // Start a transaction
    const transaction = await sequelize.transaction();
    try {
      // Call the bill service to create the bill. The service will handle notifications.
      const result = await billService.createBill({
        service: houseService,
        baseAmount: amount,
        transaction,
        customDueDate: dueDate ? new Date(dueDate) : null,
        billType
      });

      // Commit the transaction; afterCommit hooks in the bill service will send push notifications.
      await transaction.commit();

      return res.status(201).json({
        message: 'Bill, charges, and notifications created successfully',
        bill: result.bill,
        charges: result.charges
      });
    } catch (err) {
      await transaction.rollback();
      logger.error('Error in transaction:', err);
      next(err);
    }
  } catch (err) {
    logger.error('Error creating bill:', err);
    next(err);
  }
};

/**
 * Get all bills for a specified house, with optional filtering by bill type.
 */
exports.getBillsForHouse = async (req, res, next) => {
  try {
    const { houseId } = req.params;
    const { billType } = req.query;

    // Authorization: Ensure the user belongs to the requested house.
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

    // CORRECTED: Use houseServiceModel alias instead of houseService
    const bills = await Bill.findAll({
      where: whereCondition,
      attributes: ['id', 'name', 'amount', 'status', 'billType', 'dueDate', 'createdAt', 'providerPaid', 'providerPaidAt'],

      include: [
        {
          model: Charge,
          attributes: ['id', 'amount', 'status', 'name', 'userId', 'advanced'], // ← Include advanced field
          include: [
            {
              model: User,
              attributes: ['id', 'username'],
            },
          ],
        },
        {
          model: HouseService,
          as: 'houseServiceModel', // Changed from 'houseService' to 'houseServiceModel'
          attributes: ['id', 'name', 'type']
        }
      ],
      order: [['createdAt', 'DESC']]
    });

    // Get the house finance info to include the balance.
    const houseFinance = await HouseFinance.findOne({ where: { houseId } });
    res.status(200).json({
      bills,
      houseBalance: houseFinance ? houseFinance.balance : 0
    });
  } catch (error) {
    logger.error('Error fetching bills for house:', error);
    next(error);
  }
};

// Update getBillForHouse as well for consistency
exports.getBillForHouse = async (req, res, next) => {
  try {
    const { houseId, billId } = req.params;

    if (req.user.houseId != houseId) {
      return res.status(403).json({ error: 'Unauthorized access to house bill' });
    }

    const house = await House.findByPk(houseId);
    if (!house) {
      return res.status(404).json({ message: 'House not found' });
    }

    // CORRECTED: Use houseServiceModel alias instead of houseService
    const bill = await Bill.findOne({
      where: { id: billId, houseId },
      attributes: ['id', 'name', 'amount', 'status', 'billType', 'dueDate', 'createdAt', 'providerPaid', 'providerPaidAt'],

      include: [
        {
          model: Charge,
          attributes: ['id', 'amount', 'status', 'name', 'userId', 'advanced', 'advancedAt'], // ← Include advance fields
          include: [
            {
              model: User,
              attributes: ['id', 'username']
            },
          ],
        },
        {
          model: HouseService,
          as: 'houseServiceModel', // Changed from 'houseService' to 'houseServiceModel'
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

// Update to the getPaidBillsForHouse function
exports.getPaidBillsForHouse = async (req, res) => {
  try {
    const { houseId } = req.params;

    // If this is a system request (confirmed by middleware), skip user authorization check
    if (!req.isSystemRequest) {
      // Only check user authorization if it's not a system request
      if (req.user.houseId != houseId) {
        return res.status(403).json({ error: 'Unauthorized access to house bills' });
      }
    }

    const bills = await Bill.findAll({
      where: { houseId, status: 'paid' }
    });

    if (!bills || bills.length === 0) {
      return res.status(404).json({ message: 'No paid bills found for this house' });
    }

    res.status(200).json(bills);
  } catch (error) {
    logger.error('Error fetching paid bills for house:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

/**
 * Generate fixed recurring bills. Admins can generate for all houses by setting houseId to '0'.
 */
exports.generateFixedBills = async (req, res, next) => {
  try {
    const { houseId } = req.params;

    // Authorization: Check if the user is admin or belongs to the specified house.
    if (houseId !== '0' && req.user.houseId != houseId && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Unauthorized to generate bills for this house' });
    }
    if (houseId === '0' && !req.user.isAdmin) {
      return res.status(403).json({ error: 'Only administrators can generate bills for all houses' });
    }

    let result;
    if (houseId === '0') {
      // Generate bills for all houses.
      result = await billService.generateFixedRecurringBills();
    } else {
      // Generate bills for a specific house.
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
    res.status(500).json({ error: 'Failed to generate fixed bills', details: error.message });
  }
};

/**
 * Submit a variable bill amount.
 */
exports.submitVariableBillAmount = async (req, res) => {
  try {
    const { serviceId } = req.params;
    const { amount, userId } = req.body;

    // Authorization: The authenticated user must match the userId provided.
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
    if (req.user.houseId != service.houseId) {
      return res.status(403).json({ error: 'Service does not belong to your house' });
    }
    if (service.type !== 'variable_recurring') {
      return res.status(400).json({ error: 'Service is not a variable recurring service' });
    }
    if (service.designatedUserId && service.designatedUserId !== parseInt(userId)) {
      return res.status(403).json({ error: 'Only the designated user can submit bill amounts for this service' });
    }

    const transaction = await sequelize.transaction();
    try {
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
    res.status(500).json({ error: 'Failed to submit variable bill amount', details: error.message });
  }
};

/**
 * Mark a bill as provider-paid (HouseTabz sent payment to service provider)
 * NOW WITH ADVANCEMENT LOGIC!
 */
exports.markProviderPaid = async (req, res) => {
  const { billId } = req.params;
  console.log('[markProviderPaid] PATCH request for billId:', billId);

  try {
    const bill = await Bill.findByPk(billId, {
      include: [{ 
        model: Charge,
        attributes: ['id', 'amount', 'status', 'userId', 'advanced'] 
      }]
    });

    if (!bill) {
      console.warn('[markProviderPaid] Bill not found');
      return res.status(404).json({ error: 'Bill not found' });
    }

    if (bill.providerPaid) {
      console.warn('[markProviderPaid] Already marked providerPaid');
      return res.status(400).json({ error: 'Provider already marked as paid' });
    }

    console.log('[markProviderPaid] Proceeding to process provider payment...');

    // Start transaction and call the new processProviderPayment method
    const transaction = await sequelize.transaction();
    try {
      const result = await bill.processProviderPayment(transaction);
      await transaction.commit();

      console.log(`[markProviderPaid] Bill ${bill.id} successfully processed with advancement result:`, result);

      return res.status(200).json({
        message: 'Provider payment processed successfully',
        bill: await Bill.findByPk(billId, { // Refresh bill data
          include: [{ 
            model: Charge,
            attributes: ['id', 'amount', 'status', 'userId', 'advanced', 'advancedAt'] 
          }]
        }),
        advancementResult: result
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }

  } catch (err) {
    console.error('Error in markProviderPaid:', err);
    res.status(500).json({ 
      error: 'Failed to process provider payment',
      details: err.message 
    });
  }
};

/**
 * Generate variable service reminders.
 * This endpoint is for admin use.
 */
exports.generateVariableReminders = async (req, res) => {
  try {
    if (!req.user.isAdmin) {
      return res.status(403).json({ error: 'Only administrators can generate variable reminders' });
    }

    const result = await billService.generateVariableServiceReminders();
    res.status(200).json(result);
  } catch (error) {
    logger.error('Error generating variable service reminders:', error);
    res.status(500).json({ error: 'Failed to generate variable service reminders', details: error.message });
  }
};

/**
 * Retrieve variable recurring services assigned to a user.
 */
exports.getUserVariableServices = async (req, res) => {
  try {
    const { userId } = req.query;

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
          createdAt: { [Op.gte]: firstDayOfMonth }
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
    res.status(500).json({ error: 'Failed to fetch variable services', details: error.message });
  }
};

module.exports = exports;