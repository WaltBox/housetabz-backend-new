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
const hsiService = require('../services/hsiService');
const financeService = require('../services/financeService'); // Import the finance service
const { Op } = require('sequelize');
const { createLogger } = require('../utils/logger');

const logger = createLogger('bill-controller');

exports.createBill = async (req, res, next) => {
  try {
    const { houseId } = req.params;
    const { amount, houseServiceId, billType, dueDate } = req.body;

    if (!houseServiceId) {
      return res.status(400).json({ error: 'houseServiceId is required' });
    }

    const houseService = await HouseService.findByPk(houseServiceId);
    if (!houseService) {
      return res.status(404).json({ error: 'HouseService not found' });
    }

    // Start a transaction for all operations
    const transaction = await sequelize.transaction();

    try {
      // Get all users in the house to calculate fees
      const users = await User.findAll({ 
        where: { houseId },
        transaction
      });
      
      const numberOfUsers = users.length;
      
      // Get the base amount
      const baseAmount = parseFloat(amount);
      
      // Retrieve the current HouseStatusIndex for the house
      const houseStatus = await HouseStatusIndex.findOne({
        where: { houseId },
        order: [['updatedAt', 'DESC']]
      }, { transaction });
      
      const hsiScore = houseStatus ? houseStatus.score : 50;
      
      // Calculate the base service fee per user based on fee category
      const baseServiceFeeRate = houseService.feeCategory === 'card' ? 2.00 : 0.00;
      const totalBaseServiceFee = numberOfUsers * baseServiceFeeRate;
      
      // Use the existing HSI service to calculate the fee multiplier
      const feeMultiplier = hsiService.calculateFeeMultiplier(hsiScore);
      
      // Calculate the total service fee with HSI adjustment
      const totalServiceFee = parseFloat((totalBaseServiceFee * feeMultiplier).toFixed(2));
      
      // Calculate the total bill amount including service fees
      const totalAmount = parseFloat((baseAmount + totalServiceFee).toFixed(2));
      
      // Create the Bill with both base amount and service fee
      const bill = await Bill.create({
        houseId,
        baseAmount: baseAmount,
        serviceFeeTotal: totalServiceFee,
        amount: totalAmount,
        houseService_id: houseServiceId,
        name: houseService.name,
        status: 'pending',
        billType: billType || 'regular',
        dueDate: dueDate ? new Date(dueDate) : null
      }, { transaction });

      // Calculate each user's portion
      const baseChargeAmount = parseFloat((baseAmount / numberOfUsers).toFixed(2));
      const chargeServiceFee = parseFloat((totalServiceFee / numberOfUsers).toFixed(2));

      // Create charges for each user
      const charges = users.map((user) => ({
        userId: user.id,
        baseAmount: baseChargeAmount,
        serviceFee: chargeServiceFee,
        amount: parseFloat((baseChargeAmount + chargeServiceFee).toFixed(2)),
        status: 'unpaid',
        billId: bill.id,
        name: bill.name,
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

      const createdCharges = await Charge.bulkCreate(charges, { transaction });

      // Create notifications for each charge
      const notifications = createdCharges.map((charge) => ({
        userId: charge.userId,
        message: `Hey user, you have a new charge of $${Number(charge.amount).toFixed(2)} for ${charge.name}.`,
        metadata: {
          type: 'new_charge',
          chargeId: charge.id,
          billId: bill.id,
          amount: Number(charge.amount)
        }
      }));

      await Notification.bulkCreate(notifications, { transaction });

      // Update user balances using the finance service
      for (const user of users) {
        const userCharge = createdCharges.find(charge => charge.userId === user.id);
        if (userCharge) {
          await financeService.addUserCharge(
            user.id,
            userCharge.amount,
            `New charge for ${bill.name}`,
            transaction,
            {
              billId: bill.id,
              chargeId: userCharge.id,
              billType: billType || 'regular'
            }
          );
        }
      }

      // Update house balance using the finance service with the TOTAL amount
      await financeService.updateHouseBalance(
        houseId,
        totalAmount, // Use the total amount including service fees
        'CHARGE',
        `New bill: ${bill.name}`,
        transaction,
        {
          billId: bill.id,
          billType: billType || 'regular',
          serviceId: houseServiceId
        }
      );

      await transaction.commit();

      res.status(201).json({
        message: 'Bill, charges, and notifications created successfully',
        bill,
        charges: createdCharges
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error in transaction:', error);
      throw error;
    }
  } catch (error) {
    logger.error('Error creating bill:', error);
    next(error);
  }
};

exports.getBillsForHouse = async (req, res, next) => {
  try {
    const { houseId } = req.params;
    const { billType } = req.query;

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

exports.getBillForHouse = async (req, res, next) => {
  try {
    const { houseId, billId } = req.params;

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
    
    let result;
    if (houseId === '0') {
      result = await billService.generateFixedRecurringBills();
    } else {
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
    
    if (!serviceId || !amount || !userId) {
      return res.status(400).json({ error: 'Missing required fields' });
    }
    
    const service = await HouseService.findByPk(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }
    
    if (service.type !== 'variable_recurring') {
      return res.status(400).json({ error: 'Service is not a variable recurring service' });
    }
    
    if (service.designatedUserId && service.designatedUserId !== parseInt(userId)) {
      return res.status(403).json({ 
        error: 'Only the designated user can submit bill amounts for this service' 
      });
    }

    const today = new Date();
    const dueDate = new Date(today.getFullYear(), today.getMonth(), service.dueDay || 1);
    if (dueDate < today) {
      dueDate.setMonth(dueDate.getMonth() + 1);
    }

    const transaction = await sequelize.transaction();
    
    try {
      // Get all users in the house
      const users = await User.findAll({ 
        where: { houseId: service.houseId },
        transaction
      });
      
      if (!users.length) {
        throw new Error('No users found for this house');
      }
      
      const numberOfUsers = users.length;
      const baseAmount = parseFloat(amount);
      
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
      const totalAmount = parseFloat((baseAmount + totalServiceFee).toFixed(2));
      
      // Create the bill with the new structure
      const bill = await Bill.create({
        houseId: service.houseId,
        baseAmount: baseAmount,
        serviceFeeTotal: totalServiceFee,
        amount: totalAmount,
        houseService_id: service.id,
        name: service.name,
        status: 'pending',
        dueDate,
        billType: 'variable_recurring',
        createdBy: userId,
        metadata: {
          submittedAt: new Date(),
          submittedByUserId: userId
        }
      }, { transaction });
      
      // Calculate each user's portion
      const baseChargeAmount = parseFloat((baseAmount / numberOfUsers).toFixed(2));
      const chargeServiceFee = parseFloat((totalServiceFee / numberOfUsers).toFixed(2));
      
      // Create charges for each user
      const chargeData = users.map((user) => ({
        userId: user.id,
        billId: bill.id,
        baseAmount: baseChargeAmount,
        serviceFee: chargeServiceFee,
        amount: parseFloat((baseChargeAmount + chargeServiceFee).toFixed(2)),
        name: service.name,
        status: 'pending',
        dueDate: bill.dueDate,
        hsiAtTimeOfCharge: hsiScore,
        pointsPotential: 2,
        metadata: {
          baseServiceFee: baseServiceFeeRate,
          adjustedServiceFee: chargeServiceFee,
          feeMultiplier: feeMultiplier
        }
      }));
      
      const createdCharges = await Charge.bulkCreate(chargeData, { transaction });
      
      // Create notifications
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
      
      // Update user balances
      for (const user of users) {
        const userCharge = createdCharges.find(charge => charge.userId === user.id);
        if (userCharge) {
          await financeService.addUserCharge(
            user.id,
            userCharge.amount,
            `Variable charge for ${service.name}`,
            transaction,
            {
              billId: bill.id,
              chargeId: userCharge.id,
              billType: 'variable_recurring'
            }
          );
        }
      }
      
      // Update house balance with total amount
      await financeService.updateHouseBalance(
        service.houseId,
        totalAmount,
        'CHARGE',
        `Variable bill: ${service.name}`,
        transaction,
        {
          billId: bill.id,
          billType: 'variable_recurring',
          serviceId: service.id
        }
      );
      
      await transaction.commit();
      
      return res.status(201).json({
        message: 'Variable bill created successfully',
        bill,
        charges: createdCharges
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