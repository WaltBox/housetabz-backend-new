// src/controllers/partnerBillController.js
const {
  HouseService,
  Bill,
  User,
  sequelize
} = require('../models');
const { Op } = require('sequelize');
const billService = require('../services/billService');
const webhookService = require('../services/webhookService');
const { createLogger } = require('../utils/logger');

const logger = createLogger('partner-bill-controller');

exports.createBill = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    // Get partner identifier from the authenticated partner
    const partnerId = req.partner.id || req.partner;

    // Extract required parameters from request body
    const {
      houseTabzAgreementId,
      externalAgreementId,
      externalBillId,
      amount,
      dueDate,
      billingPeriod
    } = req.body;

    // Validate required fields
    if (!houseTabzAgreementId || !externalBillId || !amount || !dueDate) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Missing required fields: houseTabzAgreementId, externalBillId, amount, and dueDate are required'
      });
    }

    // Validate amount is a positive number
    const parsedAmount = parseFloat(amount);
    if (isNaN(parsedAmount) || parsedAmount <= 0) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Amount must be a positive number'
      });
    }

    // Validate and parse due date
    const parsedDueDate = new Date(dueDate);
    if (isNaN(parsedDueDate.getTime())) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Invalid dueDate format. Use ISO 8601 format (e.g., 2025-05-15T00:00:00.000Z)'
      });
    }

    // Look up the house service by houseTabzAgreementId and partnerId
    const houseService = await HouseService.findOne({
      where: { 
        houseTabzAgreementId,
        partnerId
      },
      transaction
    });

    if (!houseService) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'House service not found for this agreement ID'
      });
    }

    // Ensure the service is active
    if (houseService.status !== 'active') {
      await transaction.rollback();
      return res.status(400).json({
        error: `Cannot create bill for service in ${houseService.status} status`
      });
    }

    // Check for existing bill with the same externalBillId (PostgreSQL JSONB query)
    const existingBill = await Bill.findOne({
      where: {
        houseService_id: houseService.id,
        [Op.and]: [
          sequelize.literal(`metadata->>'externalBillId' = :externalBillId`)
        ]
      },
      replacements: { externalBillId },
      transaction
    });

    if (existingBill) {
      await transaction.rollback();
      return res.status(409).json({
        error: 'Bill already exists for this externalBillId',
        billId: existingBill.id,
        existingAmount: parseFloat(existingBill.amount).toFixed(2),
        existingStatus: existingBill.status
      });
    }

    // Use the centralized bill creation service
    logger.info(`Creating bill for service ${houseService.id} with amount $${parsedAmount}`);
    
    const result = await billService.createBill({
      service: houseService,
      baseAmount: parsedAmount,
      transaction,
      customDueDate: parsedDueDate
    });

    // Update the bill metadata with partner-specific details
    await result.bill.update({
      metadata: {
        ...result.bill.metadata,
        externalBillId,
        externalAgreementId: externalAgreementId || null,
        billingPeriod: billingPeriod || null,
        source: 'partner_api',
        partnerId: partnerId,
        createdViaAPI: true,
        apiTimestamp: new Date().toISOString()
      }
    }, { transaction });

    // Commit the transaction first
    await transaction.commit();
    
    // Prepare success response
    const successResponse = {
      message: 'Bill created successfully',
      billId: result.bill.id,
      amount: parseFloat(result.bill.amount).toFixed(2),
      status: result.bill.status,
      dueDate: result.bill.dueDate.toISOString(),
      chargesCreated: result.charges.length
    };

    // Send response immediately after successful commit
    res.status(201).json(successResponse);

    // Send webhook notification AFTER response (non-blocking)
    // This prevents webhook errors from affecting the API response
    setImmediate(async () => {
      try {
        await webhookService.sendWebhook(
          partnerId,
          'bill.created',
          {
            event: 'bill.created',
            houseTabzAgreementId: houseService.houseTabzAgreementId,
            externalAgreementId: externalAgreementId || null,
            externalBillId,
            billId: result.bill.id,
            amount: parsedAmount,
            totalAmount: parseFloat(result.bill.amount).toFixed(2),
            dueDate: parsedDueDate.toISOString(),
            billingPeriod: billingPeriod || null,
            chargesCreated: result.charges.length,
            status: 'pending'
          }
        );
      } catch (webhookError) {
        // Log webhook error but don't affect the API response
        logger.error(`Failed to send bill.created webhook to partner ${partnerId}:`, webhookError);
      }
    });

  } catch (error) {
    // Only rollback if transaction is still active
    if (!transaction.finished) {
      await transaction.rollback();
    }
    
    logger.error('Error creating bill from partner:', error);
    
    // Return appropriate error response
    if (error.message.includes('No users found')) {
      return res.status(400).json({
        error: 'No housemates found for this agreement',
        message: 'The house associated with this agreement has no active users'
      });
    }
    
    res.status(500).json({
      error: 'Failed to create bill',
      message: error.message
    });
  }
};

exports.updateBill = async (req, res) => {
  const transaction = await sequelize.transaction();
  
  try {
    const partnerId = req.partner.id || req.partner;
    const { externalBillId } = req.params;
    const { amount, dueDate } = req.body;

    // Validate that there is something to update
    if (!amount && !dueDate) {
      await transaction.rollback();
      return res.status(400).json({
        error: 'No update fields provided. Specify amount and/or dueDate'
      });
    }

    // Find the bill by externalBillId in the metadata (PostgreSQL JSONB query)
    const bill = await Bill.findOne({
      where: {
        [Op.and]: [
          sequelize.literal(`metadata->>'externalBillId' = :externalBillId`)
        ]
      },
      include: [{
        model: HouseService,
        as: 'houseServiceModel', // Use correct alias
        where: { partnerId }
      }],
      replacements: { externalBillId },
      transaction
    });

    if (!bill) {
      await transaction.rollback();
      return res.status(404).json({
        error: 'Bill not found',
        message: `No bill found with externalBillId: ${externalBillId}`
      });
    }

    // Do not allow updates if the bill is already paid
    if (bill.status === 'paid') {
      await transaction.rollback();
      return res.status(400).json({
        error: 'Cannot update a bill that has already been paid',
        billId: bill.id,
        currentStatus: bill.status
      });
    }

    const updates = {};
    let shouldRecalculateCharges = false;

    // Handle amount update
    if (amount) {
      const parsedAmount = parseFloat(amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'Amount must be a positive number'
        });
      }

      // Recalculate fees using the same logic as bill service
      const users = await User.findAll({
        where: { houseId: bill.houseServiceModel.houseId },
        transaction
      });

      const numberOfUsers = users.length;
      const baseServiceFeeRate = bill.houseServiceModel.feeCategory === 'card' ? 2.00 : 0.00;
      const totalBaseServiceFee = numberOfUsers * baseServiceFeeRate;
      
      // For simplicity, use fee multiplier of 1.0 for updates
      const totalServiceFee = totalBaseServiceFee;
      const totalAmount = parseFloat((parsedAmount + totalServiceFee).toFixed(2));

      updates.baseAmount = parsedAmount;
      updates.serviceFeeTotal = totalServiceFee;
      updates.amount = totalAmount;
      shouldRecalculateCharges = true;
    }

    // Handle due date update
    if (dueDate) {
      const parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'Invalid dueDate format. Use ISO 8601 format'
        });
      }
      updates.dueDate = parsedDueDate;
    }

    // Update the bill record
    await bill.update(updates, { transaction });

    // Update related charges if amount changed
    if (shouldRecalculateCharges) {
      const charges = await bill.getCharges({ transaction });
      const baseShareAmount = parseFloat((updates.baseAmount / charges.length).toFixed(2));
      const feeShareAmount = parseFloat((updates.serviceFeeTotal / charges.length).toFixed(2));
      const totalShareAmount = parseFloat((baseShareAmount + feeShareAmount).toFixed(2));

      for (const charge of charges) {
        await charge.update({
          baseAmount: baseShareAmount,
          serviceFee: feeShareAmount,
          amount: totalShareAmount,
          dueDate: updates.dueDate || charge.dueDate
        }, { transaction });
      }
    } else if (updates.dueDate) {
      // Update just the due date on charges
      const charges = await bill.getCharges({ transaction });
      for (const charge of charges) {
        await charge.update({ dueDate: updates.dueDate }, { transaction });
      }
    }

    // Commit transaction first
    await transaction.commit();

    // Prepare success response
    const successResponse = {
      message: 'Bill updated successfully',
      billId: bill.id,
      amount: parseFloat(bill.amount).toFixed(2),
      dueDate: bill.dueDate.toISOString(),
      status: bill.status
    };

    // Send response immediately
    res.status(200).json(successResponse);

    // Send webhook notification AFTER response (non-blocking)
    setImmediate(async () => {
      try {
        await webhookService.sendWebhook(
          partnerId,
          'bill.updated',
          {
            event: 'bill.updated',
            houseTabzAgreementId: bill.houseServiceModel.houseTabzAgreementId,
            externalBillId,
            billId: bill.id,
            amount: bill.baseAmount,
            totalAmount: parseFloat(bill.amount).toFixed(2),
            dueDate: bill.dueDate.toISOString(),
            status: bill.status,
            updatedFields: Object.keys(updates)
          }
        );
      } catch (webhookError) {
        logger.error(`Failed to send bill.updated webhook to partner ${partnerId}:`, webhookError);
      }
    });

  } catch (error) {
    // Only rollback if transaction is still active
    if (!transaction.finished) {
      await transaction.rollback();
    }
    
    logger.error('Error updating bill from partner:', error);
    res.status(500).json({
      error: 'Failed to update bill',
      message: error.message
    });
  }
};

module.exports = exports;