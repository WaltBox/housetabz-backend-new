// src/controllers/partnerBillController.js
const {
    HouseService,
    Bill,
    // Charge,   // No longer needed to manually create charges here
    User,
    sequelize
    // WebhookLog  // Remove if not used here
  } = require('../models');
  const billService = require('../services/billService'); // Use the centralized bill service
  const { createLogger } = require('../utils/logger');
  
  const logger = createLogger('partner-bill-controller');
  
  exports.createBill = async (req, res) => {
    const transaction = await sequelize.transaction();
    try {
      // Get partner identifier from the authenticated partner.
      // (Depending on your auth middleware, req.partner might be an object or an ID.)
      const partnerId = req.partner.id || req.partner;
  
      // Extract required parameters from request body.
      // externalBillId is used to avoid duplicate bill creations.
      const {
        houseTabzAgreementId,
        externalAgreementId,
        externalBillId,
        amount,
        dueDate,
        billingPeriod
      } = req.body;
  
      // Validate required fields.
      if (!houseTabzAgreementId || !externalBillId || !amount || !dueDate) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'Missing required fields: houseTabzAgreementId, externalBillId, amount, and dueDate are required'
        });
      }
  
      // Look up the house service by houseTabzAgreementId and partnerId.
      const houseService = await HouseService.findOne({
        where: { 
          houseTabzAgreementId,
          partnerId
        },
        // Inclusion of users is not necessary here since the bill service will fetch users.
        transaction
      });
  
      if (!houseService) {
        await transaction.rollback();
        return res.status(404).json({
          error: 'House service not found for this agreement ID'
        });
      }
  
      // Ensure the service is active.
      if (houseService.status !== 'active') {
        await transaction.rollback();
        return res.status(400).json({
          error: `Cannot create bill for service in ${houseService.status} status`
        });
      }
  
      // Check for an existing bill with the same externalBillId.
      // (The new bill service does not perform this duplicate check.
      // You may want to preserve it here.)
      const existingBill = await Bill.findOne({
        where: {
          houseService_id: houseService.id,
          // Sequelize does not support querying nested JSON fields directly in a portable manner.
          // Adjust the query according to your DB setup (e.g., using PostgreSQL JSON operators).
          // Here we assume a simple check for clarity.
          metadata: { externalBillId }
        },
        transaction
      });
  
      if (existingBill) {
        await transaction.rollback();
        return res.status(409).json({
          error: 'Bill already exists for this externalBillId',
          billId: existingBill.id
        });
      }
  
      // Use the centralized bill creation logic.
      // By calling createBill, we let the service perform fee calculations, create charges, send notifications,
      // and update balances. We pass in the custom due date (converted to a Date object) and the partner as the creator.
      const result = await billService.createBill({
        service: houseService,
        baseAmount: amount,
        createdBy: partnerId,
        transaction,
        customDueDate: new Date(dueDate)
      });
  
      // Optionally, update the bill metadata with partner-specific details.
      await result.bill.update({
        metadata: {
          ...result.bill.metadata,
          externalBillId,
          externalAgreementId,
          billingPeriod,
          source: 'partner_api'
        }
      }, { transaction });
  
      await transaction.commit();
  
      res.status(201).json({
        message: 'Bill created successfully',
        billId: result.bill.id,
        amount: result.bill.amount,
        status: result.bill.status,
        dueDate: result.bill.dueDate,
        chargesCreated: result.charges.length
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error creating bill from partner:', error);
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
  
      // Validate that there is something to update.
      if (!amount && !dueDate) {
        await transaction.rollback();
        return res.status(400).json({
          error: 'No update fields provided'
        });
      }
  
      // Find the bill by externalBillId in the metadata.
      // (Adapt the lookup for your JSON structure and DB if necessary.)
      const bill = await Bill.findOne({
        where: {
          metadata: { externalBillId }
        },
        include: [{
          model: HouseService,
          as: 'houseService',
          where: { partnerId }
        }],
        transaction
      });
  
      if (!bill) {
        await transaction.rollback();
        return res.status(404).json({
          error: 'Bill not found'
        });
      }
  
      // Do not allow updates if the bill is already paid.
      if (bill.status === 'paid') {
        await transaction.rollback();
        return res.status(400).json({
          error: 'Cannot update a bill that has already been paid'
        });
      }
  
      const updates = {};
  
      // If the amount is being updated, recalculate fees.
      // Note: This controller is still manually handling the update logic.
      // You might eventually want to centralize update behavior in your bill service.
      if (amount) {
        // Here we recalculate fees with the original 5% logic;
        // you may modify this to mirror your bill service fee calculation if needed.
        const serviceFeeRate = 0.05;
        const serviceFee = parseFloat((amount * serviceFeeRate).toFixed(2));
        const totalAmount = parseFloat(amount) + serviceFee;
  
        updates.amount = totalAmount;
        updates.baseAmount = amount;
        updates.serviceFeeTotal = serviceFee;
      }
  
      // Update due date if provided.
      if (dueDate) {
        updates.dueDate = new Date(dueDate);
      }
  
      // Update the bill record.
      await bill.update(updates, { transaction });
  
      // If the amount changed, update all related charges.
      if (amount) {
        const charges = await bill.getCharges({ transaction });
        const shareAmount = parseFloat((updates.amount / charges.length).toFixed(2));
  
        for (const charge of charges) {
          await charge.update({ amount: shareAmount }, { transaction });
        }
      }
  
      await transaction.commit();
  
      res.status(200).json({
        message: 'Bill updated successfully',
        billId: bill.id,
        amount: bill.amount,
        dueDate: bill.dueDate,
        status: bill.status
      });
    } catch (error) {
      await transaction.rollback();
      logger.error('Error updating bill from partner:', error);
      res.status(500).json({
        error: 'Failed to update bill',
        message: error.message
      });
    }
  };
  
  module.exports = exports;
  