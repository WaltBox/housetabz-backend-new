// src/controllers/paymentMethodController.js
const stripeService = require('../services/StripeService');
const { createLogger } = require('../utils/logger');
const { PaymentMethod } = require('../models');

const logger = createLogger('payment-method-controller');

exports.createSetupIntent = async (req, res) => {
  try {
    logger.info(`Creating setup intent for user: ${req.user.id}`);
    const setupIntent = await stripeService.createSetupIntent(req.user.id);
    res.json({
      clientSecret: setupIntent.client_secret,
      setupIntentId: setupIntent.id
    });
  } catch (error) {
    logger.error('Error creating setup intent:', error);
    res.status(500).json({
      error: 'Failed to create setup intent',
      message: error.message
    });
  }
};

exports.completeSetupIntent = async (req, res) => {
  try {
    const { setupIntentId } = req.body;
    const userId = req.user.id;

    if (!setupIntentId) {
      return res.status(400).json({ error: 'Missing setupIntentId' });
    }

    const setupIntent = await stripeService.retrieveSetupIntent(setupIntentId);
    const stripePaymentMethodId = setupIntent.payment_method;

    if (!stripePaymentMethodId) {
      return res.status(400).json({ error: 'No payment method attached to SetupIntent' });
    }

    // Validate that this setup intent is for this user
    // This could be done by checking additional metadata on the setupIntent if available

    const paymentMethod = await stripeService.createPaymentMethodFromSetupIntent(userId, stripePaymentMethodId);

    // Advance onboarding step if user was on 'payment' step or complete onboarding
    try {
      const { User } = require('../models');
      const user = await User.findByPk(userId);
      if (user) {
        await user.advanceOnboardingStep();
      }
    } catch (error) {
      console.error('Error advancing onboarding step after adding payment method:', error);
      // Don't fail the payment method creation if onboarding step update fails
    }

    res.json({
      message: 'Payment method added successfully',
      paymentMethod
    });
  } catch (error) {
    logger.error('Error completing setup intent:', error);
    res.status(500).json({
      error: 'Failed to complete setup intent',
      message: error.message
    });
  }
};

exports.getPaymentMethods = async (req, res) => {
  try {
    const paymentMethods = await stripeService.getPaymentMethods(req.user.id);
    if (!paymentMethods || paymentMethods.length === 0) {
      return res.status(200).json({ message: 'You need a card on file' });
    }
    return res.json({ paymentMethods });
  } catch (error) {
    // Check if the error has a response with status 401 (unauthorized from Stripe)
    if (error.response && error.response.status === 401) {
      return res.status(200).json({ message: 'You need a card on file' });
    }
    // Otherwise, log and return a 500 error.
    logger.error('Error getting payment methods:', error);
    return res.status(500).json({
      error: 'Failed to get payment methods',
      message: error.message
    });
  }
};

exports.setDefaultPaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Determine if the id is a database ID or Stripe payment method ID
    let paymentMethod;
    let paymentMethodDbId;
    
    if (id.startsWith('pm_')) {
      // It's a Stripe payment method ID
      paymentMethod = await PaymentMethod.findOne({
        where: { stripePaymentMethodId: id, userId }
      });
      
      if (!paymentMethod) {
        return res.status(403).json({ 
          error: 'Unauthorized access to payment method'
        });
      }
      
      paymentMethodDbId = paymentMethod.id;
    } else {
      // It's a database payment method ID
      paymentMethodDbId = parseInt(id, 10);
      
      paymentMethod = await PaymentMethod.findOne({
        where: { id: paymentMethodDbId, userId }
      });
      
      if (!paymentMethod) {
        return res.status(403).json({ 
          error: 'Unauthorized access to payment method'
        });
      }
    }

    // Call the service with the database payment method ID
    await stripeService.setDefaultPaymentMethod(userId, paymentMethodDbId);
    const updatedMethods = await stripeService.getPaymentMethods(userId);

    res.json({
      message: 'Default payment method updated',
      paymentMethods: updatedMethods
    });
  } catch (error) {
    logger.error('Error setting default payment method:', error);
    res.status(500).json({
      error: 'Failed to set default payment method',
      message: error.message
    });
  }
};

exports.removePaymentMethod = async (req, res) => {
  try {
    const userId = req.user.id;
    const { id } = req.params;

    // Add explicit authorization check - verify this payment method belongs to the user
    // First check in our database (if we store payment methods)
    const paymentMethod = await PaymentMethod.findOne({
      where: { stripePaymentMethodId: id, userId }
    });

    if (!paymentMethod) {
      // If not found in our database, verify with Stripe
      const methods = await stripeService.getPaymentMethods(userId);
      const methodExists = methods.some(method => method.id === id);
      
      if (!methodExists) {
        return res.status(403).json({ 
          error: 'Unauthorized access to payment method'
        });
      }
    }

    const paymentMethods = await stripeService.getPaymentMethods(userId);
    if (paymentMethods.length === 1) {
      return res.status(400).json({
        error: 'Cannot remove only payment method'
      });
    }

    await stripeService.removePaymentMethod(userId, id);
    const updatedMethods = await stripeService.getPaymentMethods(userId);

    res.json({
      message: 'Payment method removed successfully',
      paymentMethods: updatedMethods
    });
  } catch (error) {
    logger.error('Error removing payment method:', error);
    res.status(500).json({
      error: 'Failed to remove payment method',
      message: error.message
    });
  }
};