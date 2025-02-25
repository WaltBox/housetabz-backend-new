// src/controllers/paymentController.js
const { Payment, Task, User, ServiceRequestBundle, StagedRequest, Charge, PaymentMethod, House } = require('../models');
const stripeService = require('../services/StripeService');
const paymentStateService = require('../services/PaymentStateService');
const { sequelize } = require('../models');
const { createLogger } = require('../utils/logger');

const logger = createLogger('payment-controller');

const paymentController = {
  async processPayment(req, res) {
    try {
      const { taskId, paymentMethodId } = req.body;
      const idempotencyKey = req.headers['idempotency-key'];
      const userId = req.user.id;

      if (!idempotencyKey) {
        return res.status(400).json({ 
          error: 'Missing idempotency key',
          code: 'MISSING_IDEMPOTENCY_KEY'
        });
      }

      // Check for existing payment with this idempotency key
      const existingIdempotentPayment = await Payment.findOne({
        where: { idempotencyKey },
        include: [{
          model: Task,
          as: 'task',
          include: [{
            model: ServiceRequestBundle,
            as: 'serviceRequestBundle',
            include: ['stagedRequest']
          }]
        }]
      });
      if (existingIdempotentPayment) {
        return res.json({
          message: 'Payment request already processed',
          payment: existingIdempotentPayment,
          task: existingIdempotentPayment.task,
          roommatestatus: await paymentStateService.checkAllRoommatesReady(
            existingIdempotentPayment.task.serviceRequestBundle.id
          )
        });
      }

      // Validate task and user
      const task = await Task.findOne({
        where: { id: taskId },
        include: [{
          model: ServiceRequestBundle,
          as: 'serviceRequestBundle',
          include: [{
            model: StagedRequest,
            as: 'stagedRequest'
          }]
        }]
      });
      if (!task) return res.status(404).json({ error: 'Task not found' });
      if (task.userId !== userId) return res.status(403).json({ error: 'Unauthorized' });
      if (task.response !== 'accepted') {
        return res.status(400).json({ 
          error: 'Task must be accepted before payment',
          currentState: task.response
        });
      }
      const existingPayment = await Payment.findOne({
        where: { taskId, status: 'completed' }
      });
      if (existingPayment) return res.status(400).json({ error: 'Payment already processed' });

      // Create initial Payment record outside of the stripe processing transaction.
      // This ensures the record is persisted even if Stripe fails.
      let payment = await Payment.create({
        taskId,
        userId,
        amount: task.paymentAmount,
        status: 'processing',
        stripePaymentMethodId: paymentMethodId,
        idempotencyKey
      });
      
      // Now, start a new transaction for the Stripe call and subsequent updates.
      const transaction = await sequelize.transaction();
      try {
        const paymentIntent = await stripeService.processPayment({
          amount: task.paymentAmount,
          userId,
          paymentMethodId,
          metadata: {
            taskId,
            paymentId: payment.id,
            serviceRequestBundleId: task.serviceRequestBundle.id
          }
        }, idempotencyKey);

        await payment.update({
          stripePaymentIntentId: paymentIntent.id,
          status: 'completed',
          paymentDate: new Date()
        }, { transaction });

        // Update related state (e.g. task and bundle) as needed.
        await paymentStateService.handlePaymentCompletion(payment.id);
        const roommatestatus = await paymentStateService.checkAllRoommatesReady(
          task.serviceRequestBundle.id
        );
        await transaction.commit();

        // Refresh the payment record.
        payment = await Payment.findByPk(payment.id);
        return res.json({
          message: 'Payment processed successfully',
          payment,
          task,
          roommatestatus
        });
      } catch (stripeError) {
        await transaction.rollback();
        // Now update the Payment record in a new transaction to mark it as failed.
        const updateTransaction = await sequelize.transaction();
        try {
          await payment.update({
            status: 'failed',
            errorMessage: stripeError.message,
            retryCount: payment.retryCount + 1
          }, { transaction: updateTransaction });
          await updateTransaction.commit();
        } catch (updateError) {
          await updateTransaction.rollback();
          logger.error('Error updating failed payment:', updateError);
        }
        return res.status(400).json({
          error: 'Payment processing failed',
          details: stripeError.message,
          code: stripeError.code
        });
      }
    } catch (error) {
      logger.error('Error processing payment:', error);
      return res.status(500).json({ 
        error: 'Failed to process payment',
        details: error.message 
      });
    }
  },

  async processBatchPayment(req, res) {
    try {
      const { chargeIds, paymentMethodId } = req.body;
      const idempotencyKey = req.headers['idempotency-key'];
      const userId = req.user.id;
  
      if (!idempotencyKey) {
        return res.status(400).json({ 
          error: 'Missing idempotency key',
          code: 'MISSING_IDEMPOTENCY_KEY'
        });
      }
  
      // Check for existing payment with this idempotency key
      const existingIdempotentPayment = await Payment.findOne({
        where: { idempotencyKey }
      });
      if (existingIdempotentPayment) {
        return res.json({
          message: 'Payment request already processed',
          payment: existingIdempotentPayment
        });
      }
  
      // Fetch and validate all charges for the user
      const charges = await Charge.findAll({
        where: { 
          id: chargeIds,
          userId,
          status: 'pending'
        }
      });
      if (charges.length !== chargeIds.length) {
        return res.status(400).json({ 
          error: 'One or more charges not found or not eligible for payment' 
        });
      }
  
      // Calculate total amount from the charges
      const totalAmount = charges.reduce((sum, charge) => 
        sum + Number(charge.amount), 0
      );
  
      // Create Payment record first
      let payment = await Payment.create({
        userId,
        amount: totalAmount,
        status: 'processing',
        stripePaymentMethodId: String(paymentMethodId),
        idempotencyKey,
        taskId: null, // For batch payments, taskId is null
        metadata: {
          chargeIds,
          type: 'batch_payment'
        }
      });
      
      // Start a new transaction for processing the Stripe payment and updating charges.
      const transaction = await sequelize.transaction();
      try {
        const paymentIntent = await stripeService.processPayment({
          amount: totalAmount,
          userId,
          paymentMethodId,
          metadata: {
            paymentId: payment.id,
            chargeIds: chargeIds.join(','),
            type: 'batch_payment'
          }
        }, idempotencyKey);
  
        await payment.update({
          stripePaymentIntentId: paymentIntent.id,
          status: 'completed',
          paymentDate: new Date()
        }, { transaction });
  
        // Update each charge to mark it as paid
        await Promise.all(charges.map(charge => 
          charge.update({
            status: 'paid',
            stripePaymentIntentId: paymentIntent.id,
            paymentMethodId: String(paymentMethodId)
          }, { transaction })
        ));
  
        // Find the user to update their balance
        const user = await User.findByPk(userId, { transaction });
        if (user) {
          // Update user balance by subtracting the payment amount
          user.balance = (parseFloat(user.balance || 0) - parseFloat(totalAmount)).toFixed(2);
          await user.save({ transaction });
  
          // If user belongs to a house, update house balance too
          if (user.houseId) {
            const house = await House.findByPk(user.houseId, { transaction });
            if (house && house.balance !== undefined) {
              // Update house balance
              house.balance = (parseFloat(house.balance || 0) - parseFloat(totalAmount)).toFixed(2);
              await house.save({ transaction });
            }
          }
        }
  
        await transaction.commit();
        payment = await Payment.findByPk(payment.id);
        return res.json({
          message: 'Batch payment processed successfully',
          payment,
          updatedCharges: charges
        });
      } catch (stripeError) {
        await transaction.rollback();
        // Update the Payment record in a new transaction to mark it as failed.
        const updateTransaction = await sequelize.transaction();
        try {
          const truncatedMessage = stripeError.message && stripeError.message.length > 250 
            ? stripeError.message.substring(0, 250) + '...'
            : stripeError.message;
          await payment.update({
            status: 'failed',
            errorMessage: truncatedMessage,
            retryCount: payment.retryCount + 1
          }, { transaction: updateTransaction });
          await updateTransaction.commit();
        } catch (updateError) {
          await updateTransaction.rollback();
          logger.error('Error updating failed batch payment:', updateError);
        }
        return res.status(400).json({
          error: 'Payment processing failed',
          details: stripeError.message,
          code: stripeError.code
        });
      }
    } catch (error) {
      logger.error('Error processing batch payment:', error);
      return res.status(500).json({ 
        error: 'Failed to process batch payment',
        details: error.message 
      });
    }
  },
  
  async getPaymentStatus(req, res) {
    try {
      const { paymentId } = req.params;
      const userId = req.user.id;

      const payment = await Payment.findOne({
        where: { id: paymentId, userId },
        include: [{
          model: Task,
          as: 'task',
          include: [{
            model: ServiceRequestBundle,
            as: 'serviceRequestBundle',
            include: ['stagedRequest']
          }]
        }]
      });
      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      let additionalStatus = {};
      if (payment.status === 'completed' && payment.task?.serviceRequestBundle) {
        additionalStatus = await paymentStateService.checkAllRoommatesReady(
          payment.task.serviceRequestBundle.id
        );
      }

      return res.json({ 
        payment,
        bundleStatus: additionalStatus
      });
    } catch (error) {
      logger.error('Error getting payment status:', error);
      return res.status(500).json({ error: 'Failed to get payment status' });
    }
  },

  async retryPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { paymentMethodId } = req.body;
      const idempotencyKey = req.headers['idempotency-key'];
      const userId = req.user.id;

      if (!idempotencyKey) {
        return res.status(400).json({ 
          error: 'Missing idempotency key',
          code: 'MISSING_IDEMPOTENCY_KEY'
        });
      }

      const payment = await Payment.findOne({
        where: { id: paymentId, userId, status: 'failed' }
      });
      if (!payment) return res.status(404).json({ error: 'Failed payment not found' });
      if (payment.retryCount >= 3) return res.status(400).json({ error: 'Maximum retry attempts reached' });

      const retriedPayment = await paymentStateService.retryPayment(
        paymentId,
        paymentMethodId,
        idempotencyKey
      );
      return res.json({
        message: 'Payment retry initiated',
        payment: retriedPayment
      });
    } catch (error) {
      logger.error('Error retrying payment:', error);
      return res.status(500).json({ error: 'Failed to retry payment' });
    }
  },

  // NEW: Get all payments for a given user (with associated charge details)
  async getUserPayments(req, res) {
    try {
      // Expecting a parameter named userId (or id if using a user route)
      const userId = req.params.userId || req.params.id;
      if (!userId) {
        return res.status(400).json({ error: 'Missing user identifier' });
      }
      // Optionally, verify authorization here (e.g., req.user.id === userId)

      // Fetch all payments for the user
      const payments = await Payment.findAll({
        where: { userId },
        order: [['paymentDate', 'DESC']]
      });

      // For each payment, enrich with associated charges if metadata has chargeIds
      const paymentsWithCharges = await Promise.all(
        payments.map(async (payment) => {
          const chargeIds = payment.metadata.chargeIds;
          let charges = [];
          if (Array.isArray(chargeIds) && chargeIds.length > 0) {
            charges = await Charge.findAll({
              where: { id: chargeIds, userId }
            });
          }
          return { ...payment.toJSON(), charges };
        })
      );

      return res.json({ payments: paymentsWithCharges });
    } catch (error) {
      console.error('Error fetching user payments:', error);
      return res.status(500).json({ error: 'Failed to fetch user payments' });
    }
  }
};

module.exports = paymentController;
