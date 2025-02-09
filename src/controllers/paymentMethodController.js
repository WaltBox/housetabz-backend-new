// src/controllers/paymentMethodController.js
const stripeService = require('../services/StripeService');

const paymentMethodController = {
  async createSetupIntent(req, res) {
    try {
      const userId = req.user.id;
      const setupIntent = await stripeService.createSetupIntent(userId);
      
      res.json({
        clientSecret: setupIntent.client_secret
      });
    } catch (error) {
      console.error('Error creating setup intent:', error);
      res.status(500).json({ error: 'Failed to create setup intent' });
    }
  },

  async addPaymentMethod(req, res) {
    try {
      const { paymentMethodId } = req.body;
      const userId = req.user.id;

      const paymentMethod = await stripeService.addPaymentMethod(userId, paymentMethodId);

      res.json({
        message: 'Payment method added successfully',
        paymentMethod
      });
    } catch (error) {
      console.error('Error adding payment method:', error);
      res.status(500).json({ error: 'Failed to add payment method' });
    }
  },

  async getPaymentMethods(req, res) {
    try {
      const userId = req.user.id;
      const paymentMethods = await stripeService.getPaymentMethods(userId);

      res.json({ paymentMethods });
    } catch (error) {
      console.error('Error getting payment methods:', error);
      res.status(500).json({ error: 'Failed to get payment methods' });
    }
  },

  async setDefaultPaymentMethod(req, res) {
    try {
      const { paymentMethodId } = req.params;
      const userId = req.user.id;

      await stripeService.setDefaultPaymentMethod(userId, paymentMethodId);

      res.json({ message: 'Default payment method updated' });
    } catch (error) {
      console.error('Error setting default payment method:', error);
      res.status(500).json({ error: 'Failed to set default payment method' });
    }
  },

  // Add this missing method
  async removePaymentMethod(req, res) {
    try {
      const { id } = req.params;
      const userId = req.user.id;

      await stripeService.removePaymentMethod(userId, id);

      res.json({ message: 'Payment method removed successfully' });
    } catch (error) {
      console.error('Error removing payment method:', error);
      res.status(500).json({ error: 'Failed to remove payment method' });
    }
  }
};

module.exports = paymentMethodController;