// src/controllers/paymentController.js
const { Payment, Task, User, ServiceRequestBundle } = require('../models');
const stripeService = require('../services/StripeService');
const paymentStateService = require('../services/PaymentStateService');
const { sequelize } = require('../models');

const paymentController = {
  async processPayment(req, res) {
    const transaction = await sequelize.transaction();

    try {
      const { taskId, paymentMethodId } = req.body;
      const userId = req.user.id;

      // Validate task and user with detailed includes
      const task = await Task.findOne({
        where: { id: taskId },
        include: [{
          model: ServiceRequestBundle,
          as: 'serviceRequestBundle',
          include: [{
            model: StagedRequest,
            as: 'stagedRequest'
          }]
        }],
        transaction
      });

      if (!task) {
        await transaction.rollback();
        return res.status(404).json({ error: 'Task not found' });
      }

      if (task.userId !== userId) {
        await transaction.rollback();
        return res.status(403).json({ error: 'Unauthorized' });
      }

      // Validate task state
      if (task.response !== 'accepted') {
        await transaction.rollback();
        return res.status(400).json({ 
          error: 'Task must be accepted before payment',
          currentState: task.response
        });
      }

      // Check for existing payment
      const existingPayment = await Payment.findOne({
        where: {
          taskId,
          status: 'completed'
        },
        transaction
      });

      if (existingPayment) {
        await transaction.rollback();
        return res.status(400).json({ error: 'Payment already processed' });
      }

      // Create initial payment record
      const payment = await Payment.create({
        taskId,
        userId,
        amount: task.paymentAmount,
        status: 'processing',
        stripePaymentMethodId: paymentMethodId
      }, { transaction });

      // Process payment through Stripe
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
        });

        // Update payment record with success
        await payment.update({
          stripePaymentIntentId: paymentIntent.id,
          status: 'completed',
          paymentDate: new Date()
        }, { transaction });

        // Update all related states using our service
        await paymentStateService.handlePaymentCompletion(payment.id);

        // Check if all roommates are ready
        const roommatestatus = await paymentStateService.checkAllRoommatesReady(
          task.serviceRequestBundle.id
        );

        await transaction.commit();

        res.json({
          message: 'Payment processed successfully',
          payment,
          task,
          roommatestatus
        });
      } catch (stripeError) {
        // Handle Stripe-specific errors
        await payment.update({
          status: 'failed',
          errorMessage: stripeError.message,
          retryCount: payment.retryCount + 1
        }, { transaction });

        await transaction.rollback();
        
        return res.status(400).json({
          error: 'Payment processing failed',
          details: stripeError.message,
          code: stripeError.code
        });
      }
    } catch (error) {
      await transaction.rollback();
      console.error('Error processing payment:', error);
      res.status(500).json({ 
        error: 'Failed to process payment',
        details: error.message 
      });
    }
  },

  async getPaymentStatus(req, res) {
    try {
      const { paymentId } = req.params;
      const userId = req.user.id;

      const payment = await Payment.findOne({
        where: { 
          id: paymentId,
          userId 
        },
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

      // Get additional status information if payment is completed
      let additionalStatus = {};
      if (payment.status === 'completed' && payment.task?.serviceRequestBundle) {
        additionalStatus = await paymentStateService.checkAllRoommatesReady(
          payment.task.serviceRequestBundle.id
        );
      }

      res.json({ 
        payment,
        bundleStatus: additionalStatus
      });
    } catch (error) {
      console.error('Error getting payment status:', error);
      res.status(500).json({ error: 'Failed to get payment status' });
    }
  },

  async retryPayment(req, res) {
    try {
      const { paymentId } = req.params;
      const { paymentMethodId } = req.body;
      const userId = req.user.id;

      const payment = await Payment.findOne({
        where: { id: paymentId, userId, status: 'failed' }
      });

      if (!payment) {
        return res.status(404).json({ error: 'Failed payment not found' });
      }

      if (payment.retryCount >= 3) {
        return res.status(400).json({ error: 'Maximum retry attempts reached' });
      }

      const retriedPayment = await paymentStateService.retryPayment(
        paymentId,
        paymentMethodId
      );

      res.json({
        message: 'Payment retry initiated',
        payment: retriedPayment
      });
    } catch (error) {
      console.error('Error retrying payment:', error);
      res.status(500).json({ error: 'Failed to retry payment' });
    }
  }
};

module.exports = paymentController;