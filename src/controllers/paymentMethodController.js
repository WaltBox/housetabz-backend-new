// src/controllers/paymentMethodController.js
const stripeService = require('../services/StripeService');

const paymentMethodController = {
  async createSetupIntent(req, res) {
    try {
      console.log('Creating setup intent for user:', req.user.id);
      const setupIntent = await stripeService.createSetupIntent(req.user.id);
      // Return both client secret and setupIntent ID so the client can complete the flow
      res.json({ 
        clientSecret: setupIntent.client_secret,
        setupIntentId: setupIntent.id
      });
    } catch (error) {
      console.error('Error creating setup intent:', error);
      res.status(500).json({ 
        error: 'Failed to create setup intent',
        message: error.message 
      });
    }
  },

  async addPaymentMethod(req, res) {
    try {
      const { paymentMethodId } = req.body;
      if (!paymentMethodId) {
        return res.status(400).json({ error: 'Payment method ID is required' });
      }

      const paymentMethod = await stripeService.addPaymentMethod(
        req.user.id,
        paymentMethodId
      );

      res.json({
        message: 'Payment method added successfully',
        paymentMethod
      });
    } catch (error) {
      console.error('Error adding payment method:', error);
      res.status(500).json({ 
        error: 'Failed to add payment method',
        message: error.message 
      });
    }
  },

  // New endpoint: completeSetupIntent
  async completeSetupIntent(req, res) {
    try {
      const { setupIntentId } = req.body;
      if (!setupIntentId) {
        return res.status(400).json({ error: 'Missing setupIntentId' });
      }
      
      // Retrieve the SetupIntent from Stripe
      const setupIntent = await stripeService.retrieveSetupIntent(setupIntentId);
      const stripePaymentMethodId = setupIntent.payment_method;
      
      if (!stripePaymentMethodId) {
        return res.status(400).json({ error: 'No payment method attached to SetupIntent' });
      }
      
      // Create a PaymentMethod record from the already attached PaymentMethod
      const paymentMethod = await stripeService.createPaymentMethodFromSetupIntent(req.user.id, stripePaymentMethodId);
      
      res.status(201).json({ 
        message: 'Payment method completed successfully',
        paymentMethod 
      });
    } catch (error) {
      console.error('Error completing setup intent:', error);
      res.status(500).json({ 
        error: 'Failed to complete setup intent',
        message: error.message 
      });
    }
  },

  async getPaymentMethods(req, res) {
    try {
      console.log('Getting payment methods for user:', req.user.id);
      const paymentMethods = await stripeService.getPaymentMethods(req.user.id);
      res.json({ paymentMethods });
    } catch (error) {
      console.error('Error getting payment methods:', error);
      res.status(500).json({ 
        error: 'Failed to get payment methods',
        message: error.message 
      });
    }
  },

  async setDefaultPaymentMethod(req, res) {
    try {
      const { paymentMethodId } = req.params;
      await stripeService.setDefaultPaymentMethod(req.user.id, paymentMethodId);
      res.json({ message: 'Default payment method updated' });
    } catch (error) {
      console.error('Error setting default payment method:', error);
      res.status(500).json({ 
        error: 'Failed to set default payment method',
        message: error.message 
      });
    }
  },

  async removePaymentMethod(req, res) {
    try {
      const { id } = req.params;
      await stripeService.removePaymentMethod(req.user.id, id);
      res.json({ message: 'Payment method removed successfully' });
    } catch (error) {
      console.error('Error removing payment method:', error);
      res.status(500).json({ 
        error: 'Failed to remove payment method',
        message: error.message 
      });
    }
  }
};

module.exports = paymentMethodController;
