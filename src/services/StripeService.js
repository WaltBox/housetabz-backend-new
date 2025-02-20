// src/services/StripeService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { StripeCustomer, PaymentMethod, User } = require('../models');

class StripeService {
  async getOrCreateCustomer(userId) {
    try {
      // Check if customer already exists
      let stripeCustomer = await StripeCustomer.findOne({
        where: { userId },
        include: [{ model: User, as: 'user' }]
      });

      if (stripeCustomer) {
        return stripeCustomer;
      }

      // If not, create new customer
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      const customer = await stripe.customers.create({
        email: user.email,
        metadata: {
          userId: user.id
        }
      });

      // Save customer record
      stripeCustomer = await StripeCustomer.create({
        userId: user.id,
        stripeCustomerId: customer.id
      });

      return stripeCustomer;
    } catch (error) {
      console.error('Error in getOrCreateCustomer:', error);
      throw error;
    }
  }

  async processPayment({ amount, userId, paymentMethodId, metadata }, idempotencyKey) {
    try {
      const stripeCustomer = await this.getOrCreateCustomer(userId);
  
      // Get the payment method to ensure it exists and belongs to user
      const paymentMethod = await PaymentMethod.findOne({
        where: { 
          userId,
          stripePaymentMethodId: paymentMethodId
        }
      });
  
      if (!paymentMethod) {
        throw new Error('Payment method not found or unauthorized');
      }
  
      // Create payment intent with idempotency
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        customer: stripeCustomer.stripeCustomerId,
        payment_method: paymentMethodId,
        confirm: true, // Automatically confirm the payment
        metadata,
        off_session: true, // Since we're charging a saved payment method
        error_on_requires_action: true // Decline if requires authentication
      }, {
        idempotencyKey // Stripe's idempotency key
      });
  
      return paymentIntent;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  async createSetupIntent(userId) {
    try {
      const stripeCustomer = await this.getOrCreateCustomer(userId);

      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomer.stripeCustomerId,
        payment_method_types: ['card']
      });

      return setupIntent;
    } catch (error) {
      console.error('Error creating setup intent:', error);
      throw error;
    }
  }

  async getPaymentMethods(userId) {
    try {
      await this.getOrCreateCustomer(userId);
      
      const paymentMethods = await PaymentMethod.findAll({
        where: { userId },
        order: [
          ['isDefault', 'DESC'],
          ['createdAt', 'DESC']
        ]
      });

      return paymentMethods;
    } catch (error) {
      console.error('Error getting payment methods:', error);
      throw error;
    }
  }

  async addPaymentMethod(userId, paymentMethodId) {
    const transaction = await StripeCustomer.sequelize.transaction();
  
    try {
      const stripeCustomer = await this.getOrCreateCustomer(userId);
  
      // Check if this will be the first payment method BEFORE creating
      const existingMethods = await PaymentMethod.count({
        where: { userId }
      });
  
      // Attach payment method to customer in Stripe
      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomer.stripeCustomerId
      });
  
      const { card } = paymentMethod;
  
      // Save payment method - isDefault is true if no existing methods
      const savedPaymentMethod = await PaymentMethod.create({
        userId,
        stripeCustomerId: stripeCustomer.id,
        stripePaymentMethodId: paymentMethod.id,
        type: paymentMethod.type,
        last4: card.last4,
        brand: card.brand,
        isDefault: existingMethods === 0  // Set default if it's the first one
      }, { transaction });
  
      await transaction.commit();
      return savedPaymentMethod;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async setDefaultPaymentMethod(userId, paymentMethodId, transaction) {
    const t = transaction || await StripeCustomer.sequelize.transaction();

    try {
      const paymentMethod = await PaymentMethod.findOne({
        where: { id: paymentMethodId, userId }
      });

      if (!paymentMethod) {
        throw new Error('Payment method not found');
      }

      const stripeCustomer = await this.getOrCreateCustomer(userId);

      // Update in Stripe
      await stripe.customers.update(stripeCustomer.stripeCustomerId, {
        invoice_settings: {
          default_payment_method: paymentMethod.stripePaymentMethodId
        }
      });

      // Update in database
      await PaymentMethod.update(
        { isDefault: false },
        { where: { userId }, transaction: t }
      );

      await PaymentMethod.update(
        { isDefault: true },
        { where: { id: paymentMethodId }, transaction: t }
      );

      if (!transaction) {
        await t.commit();
      }

      return paymentMethod;
    } catch (error) {
      if (!transaction) {
        await t.rollback();
      }
      console.error('Error in setDefaultPaymentMethod:', error);
      throw error;
    }
  }

  async removePaymentMethod(userId, paymentMethodId) {
    const transaction = await StripeCustomer.sequelize.transaction();

    try {
      const paymentMethod = await PaymentMethod.findOne({
        where: { id: paymentMethodId, userId }
      });

      if (!paymentMethod) {
        throw new Error('Payment method not found');
      }

      // Detach from Stripe
      await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);

      // Remove from database
      await paymentMethod.destroy({ transaction });

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('Error in removePaymentMethod:', error);
      throw error;
    }
  }

  async retrieveSetupIntent(setupIntentId) {
    try {
      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      return setupIntent;
    } catch (error) {
      console.error('Error retrieving setup intent:', error);
      throw error;
    }
  }

  async createPaymentMethodFromSetupIntent(userId, stripePaymentMethodId) {
    const transaction = await StripeCustomer.sequelize.transaction();
    try {
      // Check for existing methods FIRST
      const existingMethods = await PaymentMethod.count({
        where: { userId }
      });
  
      const paymentMethod = await stripe.paymentMethods.retrieve(stripePaymentMethodId);
      const { card } = paymentMethod;
  
      // Create with isDefault based on existingMethods count
      const savedPaymentMethod = await PaymentMethod.create({
        userId,
        stripePaymentMethodId: paymentMethod.id,
        type: paymentMethod.type,
        last4: card.last4,
        brand: card.brand,
        isDefault: existingMethods === 0  // Set default if it's the first one
      }, { transaction });
  
      await transaction.commit();
      return savedPaymentMethod;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }
}

// Create an instance and export it
const stripeService = new StripeService();
module.exports = stripeService;