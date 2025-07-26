// src/controllers/paymentController.js
const { Payment, Task, User, ServiceRequestBundle, StagedRequest, Charge, PaymentMethod, House, UserFinance, HouseFinance, Bill } = require('../models');
const stripeService = require('../services/StripeService');
const paymentStateService = require('../services/PaymentStateService');
const hsiService = require('../services/houseRiskService');
const { sequelize } = require('../models');
const { createLogger } = require('../utils/logger');
const financeService = require('../services/financeService');
const urgentMessageService = require('../services/urgentMessageService');
const logger = createLogger('payment-controller');

// Calculate payment points based on charge due date
const calculatePaymentPoints = (charge) => {
  const now = new Date();
  const dueDate = new Date(charge.dueDate);
  const daysDiff = Math.floor((now - dueDate) / (1000*60*60*24));

  if (daysDiff <= -3) return 2;    // Early
  if (daysDiff < 0)    return 1;    // On‑time
  return 0;                        // No bonus if on/after due date
};

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

      // Note: paymentMethodId is now optional - if not provided, 
      // the StripeService will use the user's default payment method

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
        // Authorization check for existing payment
        if (existingIdempotentPayment.userId !== userId) {
          return res.status(403).json({ error: 'Unauthorized access to payment' });
        }
        
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
        
        // 🔥 NEW: Update urgent messages in real-time after single payment
        try {
          if (task && task.chargeId) {
            await urgentMessageService.updateUrgentMessagesForPayment({
              chargeIds: [task.chargeId],
              userId: userId,
              paymentId: payment.id
            });
            console.log('✅ Urgent messages updated after single payment');
          }
        } catch (urgentError) {
          console.error('❌ Error updating urgent messages after single payment:', urgentError);
          // Don't fail the payment if urgent message update fails
        }
        
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

 // Fixed section of processBatchPayment method in paymentController.js

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

    // Note: paymentMethodId is now optional - if not provided, 
    // the StripeService will use the user's default payment method

    // Check for existing payment with this idempotency key
    const existingIdempotentPayment = await Payment.findOne({
      where: { idempotencyKey }
    });
    
    if (existingIdempotentPayment) {
      if (existingIdempotentPayment.userId !== userId) {
        return res.status(403).json({ error: 'Unauthorized access to payment' });
      }
      
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
        status: 'unpaid'
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

    // SEPARATE ADVANCED vs NON-ADVANCED CHARGES
    const advancedCharges = charges.filter(charge => charge.advanced);
    const regularCharges = charges.filter(charge => !charge.advanced);
    const totalAdvancedAmount = advancedCharges.reduce((sum, charge) => sum + Number(charge.amount), 0);

    console.log(`Processing payment for ${charges.length} charges:`);
    console.log(`- Advanced charges: ${advancedCharges.length} ($${totalAdvancedAmount})`);
    console.log(`- Regular charges: ${regularCharges.length} ($${totalAmount - totalAdvancedAmount})`);

    // Create Payment record first
    let payment = await Payment.create({
      userId,
      amount: totalAmount,
      status: 'processing',
      stripePaymentMethodId: String(paymentMethodId),
      idempotencyKey,
      taskId: null,
      metadata: {
        chargeIds,
        type: 'batch_payment',
        advancedCharges: advancedCharges.map(c => ({ id: c.id, amount: c.amount })),
        regularCharges: regularCharges.map(c => ({ id: c.id, amount: c.amount }))
      }
    });
    
    // Start transaction for Stripe payment and updates
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
      const now = new Date();
      await Promise.all(charges.map(charge =>
        charge.update({
          status: 'paid',
          stripePaymentIntentId: paymentIntent.id,
          paymentMethodId: String(paymentMethodId),
          // SET repaidAt for advanced charges
          ...(charge.advanced && { repaidAt: now }),
          metadata: {
            ...charge.metadata,
            paidDate: now.toISOString(),
            pointsEarned: calculatePaymentPoints(charge),
            // Track if this was an advance repayment
            wasAdvancedRepayment: charge.advanced
          }
        }, { transaction })
      ));
      
      // Update bill statuses
      const billIds = [...new Set(charges.map(c => c.billId))];
      for (const billId of billIds) {
        const bill = await Bill.findByPk(billId, { transaction });
        if (bill) {
          await bill.updateStatus(transaction);
        }
      }

      // Update HouseServiceLedger for each charge (existing logic remains the same)
      for (const charge of charges) {
        try {
          const bill = await Bill.findByPk(charge.billId, { transaction });
          if (!bill) {
            console.log(`No bill found for charge ${charge.id}`);
            continue;
          }

          const houseService = await sequelize.models.HouseService.findByPk(bill.houseService_id, { transaction });
          if (!houseService) {
            console.log(`No house service found for bill ${bill.id}`);
            continue;
          }

          const ledger = await sequelize.models.HouseServiceLedger.findOne({
            where: {
              houseServiceId: houseService.id,
              status: 'active'
            },
            order: [['createdAt', 'DESC']],
            transaction
          });
          
          if (!ledger) {
            console.log(`No active ledger found for house service ${houseService.id}`);
            continue;
          }

          const currentMetadata = ledger.metadata || {};
          const fundedUsers = currentMetadata.fundedUsers || [];

          const existingFundingIndex = fundedUsers.findIndex(fu => 
            String(fu.userId) === String(charge.userId)
          );

          if (existingFundingIndex >= 0) {
            fundedUsers[existingFundingIndex].amount = Number(fundedUsers[existingFundingIndex].amount) + Number(charge.amount);
            fundedUsers[existingFundingIndex].lastUpdated = new Date();
            fundedUsers[existingFundingIndex].charges = fundedUsers[existingFundingIndex].charges || [];
            fundedUsers[existingFundingIndex].charges.push(charge.id);
          } else {
            fundedUsers.push({
              userId: Number(charge.userId),
              amount: Number(charge.amount),
              timestamp: new Date(),
              lastUpdated: new Date(),
              charges: [charge.id]
            });
          }

          const totalFundedFromMetadata = fundedUsers.reduce((sum, fu) => sum + Number(fu.amount), 0);

          await ledger.update({
            metadata: {
              ...currentMetadata,
              fundedUsers
            },
            funded: totalFundedFromMetadata
          }, { transaction });
                
        } catch (error) {
          console.error(`Error updating ledger for charge ${charge.id}:`, error);
        }
      }

      // Calculate payment points for each charge
      for (const charge of charges) {
        const pointsEarned = calculatePaymentPoints(charge);
        await charge.update({
          metadata: {
            ...charge.metadata,
            pointsEarned,
            paidDate: new Date()
          }
        }, { transaction });
      }

      // Get the user and their finance record
      const user = await User.findByPk(userId, { 
        include: [{ model: UserFinance, as: 'finance' }],
        transaction 
      });
      
      if (user) {
        let userFinance = user.finance;
        if (!userFinance) {
          userFinance = await UserFinance.create({
            userId,
            balance: user.balance || 0,
            credit: user.credit || 0,
            points: user.points || 0
          }, { transaction });
        }
        
        // Process user payment - split regular charges vs advance repayments
        const regularChargesAmount = regularCharges.reduce((sum, charge) => sum + parseFloat(charge.amount), 0);
        const advancedChargesAmount = advancedCharges.reduce((sum, charge) => sum + parseFloat(charge.amount), 0);
        
        // Process regular charges (reduces house balance)
        if (regularChargesAmount > 0) {
          await financeService.processUserPayment(
            userId,
            regularChargesAmount,
            'Batch payment for regular charges',
            transaction,
            {
              paymentId: payment.id,
              chargeIds: regularCharges.map(c => c.id).join(','),
              stripePaymentIntentId: paymentIntent.id,
              type: 'regular_charges'
            }
          );
        }
        
        // Process advance repayments separately (also reduces house balance)
        if (advancedChargesAmount > 0) {
          await financeService.processUserPayment(
            userId,
            advancedChargesAmount,
            'Batch payment for advance repayments',
            transaction,
            {
              paymentId: payment.id,
              chargeIds: advancedCharges.map(c => c.id).join(','),
              stripePaymentIntentId: paymentIntent.id,
              type: 'advance_repayments'
            }
          );
        }
        
        // Add points
        const totalPointsEarned = charges.reduce((sum, charge) => 
          sum + calculatePaymentPoints(charge), 0);
        userFinance.points += totalPointsEarned;
        await userFinance.save({ transaction });

        // CREATE ADVANCE_REPAYMENT TRANSACTIONS for advanced charges
        if (advancedCharges.length > 0) {
          console.log(`Creating ADVANCE_REPAYMENT transactions for ${advancedCharges.length} charges`);
          
          // Get house info for the transaction
          const firstCharge = advancedCharges[0];
          const bill = await Bill.findByPk(firstCharge.billId, { transaction });
          
          if (bill && bill.houseId) {
            // Get current house balance (already updated by processUserPayment above)
            const { HouseFinance } = require('../models');
            let houseFinance = await HouseFinance.findOne({ 
              where: { houseId: bill.houseId }, 
              transaction 
            });
            
            if (!houseFinance) {
              houseFinance = await HouseFinance.create({
                houseId: bill.houseId,
                balance: 0,
                ledger: 0
              }, { transaction });
            }
            
            // Calculate progressive balance changes for each charge
            let runningBalance = parseFloat(houseFinance.balance) + advancedChargesAmount;
            
            // Create individual ADVANCE_REPAYMENT transaction for each advanced charge
            for (const charge of advancedCharges) {
              const repaymentAmount = parseFloat(charge.amount);
              const balanceBefore = runningBalance;
              const balanceAfter = runningBalance - repaymentAmount;
              
              // Create ADVANCE_REPAYMENT transaction with proper balance tracking
              await sequelize.models.Transaction.create({
                houseId: bill.houseId,
                userId: userId,
                chargeId: charge.id,
                type: 'ADVANCE_REPAYMENT',
                amount: repaymentAmount,
                description: `User ${userId} repaid advanced charge ${charge.id}`,
                balanceBefore: balanceBefore.toFixed(2),
                balanceAfter: balanceAfter.toFixed(2),
                status: 'COMPLETED',
                metadata: {
                  originalAdvanceDate: charge.advancedAt,
                  repaymentDate: now.toISOString(),
                  paymentId: payment.id,
                  stripePaymentIntentId: paymentIntent.id
                }
              }, { transaction });
              
              console.log(`✓ Created ADVANCE_REPAYMENT transaction for charge ${charge.id}: $${repaymentAmount} (Balance: ${balanceBefore.toFixed(2)} → ${balanceAfter.toFixed(2)})`);
              
              // Update running balance for next iteration
              runningBalance = balanceAfter;
            }
          }
        }
      }

      await transaction.commit();
      payment = await Payment.findByPk(payment.id);
      
      // 🔥 NEW: Update urgent messages in real-time after payment
      try {
        await urgentMessageService.updateUrgentMessagesForPayment({
          chargeIds: chargeIds,
          userId: userId,
          paymentId: payment.id
        });
        console.log('✅ Urgent messages updated after payment');
      } catch (urgentError) {
        console.error('❌ Error updating urgent messages after payment:', urgentError);
        // Don't fail the payment if urgent message update fails
      }
      
      return res.json({
        message: 'Batch payment processed successfully',
        payment,
        updatedCharges: charges,
        summary: {
          totalAmount,
          advancedChargesRepaid: advancedCharges.length,
          advancedAmountRepaid: totalAdvancedAmount,
          regularChargesPaid: regularCharges.length
        }
      });
      
    } catch (stripeError) {
      await transaction.rollback();
      // Handle stripe error (existing logic)
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
    console.error('Error processing batch payment:', error);
    console.error('Error stack:', error.stack);
    
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    
    return res.status(500).json({ 
      error: 'Failed to process batch payment',
      details: error.message,
      stack: process.env.NODE_ENV === 'development_local' ? error.stack : undefined
    });
  }
},
  
  async getPaymentStatus(req, res) {
    try {
      const { paymentId } = req.params;
      const userId = req.user.id;

      const payment = await Payment.findOne({
        where: { id: paymentId, userId }, // This already ensures user can only access their own payments
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
        where: { id: paymentId, userId, status: 'failed' } // This ensures user can only retry their own failed payments
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

  async getUserPayments(req, res) {
    try {
      const userId = req.params.userId || req.params.id;
      
      if (!userId) {
        return res.status(400).json({ error: 'Missing user identifier' });
      }
      
      // Authorization check: User can only access their own payments
      if (req.user.id != userId) {
        return res.status(403).json({ error: 'Unauthorized access to user payments' });
      }

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
      logger.error('Error fetching user payments:', error);
      return res.status(500).json({ error: 'Failed to fetch user payments' });
    }
  }
};

module.exports = paymentController;