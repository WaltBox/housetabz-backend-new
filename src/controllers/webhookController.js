// src/controllers/webhookController.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const stripeService = require('../services/StripeService');

const webhookController = {
  async handleWebhook(req, res) {
    const sig = req.headers['stripe-signature'];
    let event;

    try {
      // Verify webhook signature
      event = stripe.webhooks.constructEvent(
        req.rawBody, // Make sure your Express app preserves the raw body
        sig,
        process.env.STRIPE_WEBHOOK_SECRET
      );

      // Log the event for debugging
      console.log('Received webhook event:', {
        type: event.type,
        id: event.id,
        object: event.data.object.id
      });

      // Handle the event
      await stripeService.handleWebhookEvent(event);

      // Return success
      res.json({ received: true });
    } catch (error) {
      console.error('Webhook error:', error);
      res.status(400).json({
        error: 'Webhook error',
        details: error.message
      });
    }
  }
};

module.exports = webhookController;