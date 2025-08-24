// src/controllers/stripeWebhookController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { Payment, Charge, Task } = require('../models');
const { createLogger } = require('../utils/logger');
const urgentMessageService = require('../services/urgentMessageService');
const logger = createLogger('stripe-webhook');

exports.handleWebhook = async (req, res) => {
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  const signature = req.headers['stripe-signature'];
  
  try {
    // Verify the event came from Stripe
    const event = stripe.webhooks.constructEvent(
      req.rawBody, // Important: Need raw request body
      signature,
      webhookSecret
    );
    
    logger.info(`Received Stripe webhook: ${event.type}`);
    
    // Handle different event types
    switch (event.type) {
      case 'payment_intent.succeeded':
        await handlePaymentIntentSucceeded(event.data.object);
        break;
        
      case 'payment_intent.payment_failed':
        await handlePaymentIntentFailed(event.data.object);
        break;
        
      // Add other event types as needed
    }
    
    res.status(200).json({ received: true });
  } catch (err) {
    logger.error(`Webhook Error: ${err.message}`);
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }
};

async function handlePaymentIntentSucceeded(paymentIntent) {
  // Find related payment or charge by paymentIntent.id
  logger.info(`Payment succeeded: ${paymentIntent.id}`);
  
  try {
    // Update any payments with this intent ID
    await Payment.update(
      { status: 'completed', paymentDate: new Date() },
      { where: { stripePaymentIntentId: paymentIntent.id, status: 'processing' } }
    );
    
    // Update any charges with this intent ID and get the updated charges
    const updatedCharges = await Charge.update(
      { status: 'paid' },
      { 
        where: { stripePaymentIntentId: paymentIntent.id, status: 'processing' },
        returning: true
      }
    );
    
    // 🔥 NEW: Update urgent messages after webhook payment confirmation
    try {
      // Get the payment that was just completed
      const payment = await Payment.findOne({
        where: { stripePaymentIntentId: paymentIntent.id },
        include: [{ 
          model: require('../models').User, 
          as: 'user',
          attributes: ['id', 'houseId'] 
        }]
      });
      
      if (payment && payment.metadata && payment.metadata.chargeIds) {
        const chargeIds = Array.isArray(payment.metadata.chargeIds) 
          ? payment.metadata.chargeIds 
          : payment.metadata.chargeIds.split(',').map(id => parseInt(id));
        
        await urgentMessageService.updateUrgentMessagesForPayment({
          chargeIds: chargeIds,
          userId: payment.userId,
          paymentId: payment.id
        });
        
        logger.info(`✅ Urgent messages updated for payment ${payment.id} via webhook`);
        
        // 🔥 NEW: Update HSI after webhook payment confirmation
        if (payment.user && payment.user.houseId) {
          const hsiService = require('../services/houseRiskService');
          await hsiService.updateHouseHSI(payment.user.houseId);
          logger.info(`✅ HSI updated for house ${payment.user.houseId} via webhook`);
        }
      }
    } catch (urgentError) {
      logger.error('❌ Error updating urgent messages via webhook:', urgentError);
      // Don't fail the webhook if urgent message update fails
    }
    
    // Handle any additional business logic
  } catch (error) {
    logger.error('Error handling payment success webhook:', error);
  }
}

async function handlePaymentIntentFailed(paymentIntent) {
  logger.info(`Payment failed: ${paymentIntent.id}`);
  
  try {
    // Update any payments with this intent ID
    await Payment.update(
      { 
        status: 'failed', 
        errorMessage: paymentIntent.last_payment_error?.message || 'Payment failed'
      },
      { where: { stripePaymentIntentId: paymentIntent.id } }
    );
    
    // Update any charges
    await Charge.update(
      { status: 'failed' },
      { where: { stripePaymentIntentId: paymentIntent.id } }
    );
    
    // Additional failure handling logic
  } catch (error) {
    logger.error('Error handling payment failure webhook:', error);
  }
}