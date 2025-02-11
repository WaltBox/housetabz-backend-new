// src/controllers/webhookController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeService = require('../services/StripeService');
const { StripeWebhookLog } = require('../models');
const { createLogger } = require('../utils/logger');

const logger = createLogger('webhook-controller');

const webhookController = {
  async handleWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // Verify Stripe signature
      event = stripe.webhooks.constructEvent(
        req.rawBody,
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      // Check for duplicate events
      const existingLog = await StripeWebhookLog.findOne({
        where: { stripe_event_id: event.id }
      });

      if (existingLog) {
        logger.info(`Duplicate Stripe webhook received: ${event.id}`);
        return res.status(200).json({ 
          received: true,
          duplicate: true
        });
      }

      // Log the incoming webhook
      const webhookLog = await StripeWebhookLog.create({
        stripe_event_id: event.id,
        event_type: event.type,
        payload: event.data,
        status: 'processing'
      });

      // Process the event
      logger.info('Processing Stripe webhook:', {
        type: event.type,
        id: event.id,
        object: event.data.object.id
      });

      await stripeService.handleWebhookEvent(event);

      // Update webhook log status
      await webhookLog.update({
        status: 'completed'
      });

      return res.json({ received: true });

    } catch (error) {
      logger.error('Stripe webhook error:', {
        error: error.message,
        eventId: event?.id,
        stack: error.stack
      });

      // Log error if we have event information
      if (event?.id) {
        await StripeWebhookLog.create({
          stripe_event_id: event.id,
          event_type: event.type,
          payload: event.data,
          status: 'failed',
          error: error.message
        });
      }

      return res.status(400).json({
        error: 'Webhook processing failed',
        details: error.message
      });
    }
  }
};

module.exports = webhookController;