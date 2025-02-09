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

      // Attach payment method to customer in Stripe
      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomer.stripeCustomerId
      });

      // Get payment method details
      const { card } = paymentMethod;

      // Save payment method in database
      const savedPaymentMethod = await PaymentMethod.create({
        userId,
        stripePaymentMethodId: paymentMethod.id,
        type: paymentMethod.type,
        last4: card.last4,
        brand: card.brand,
        isDefault: false
      }, { transaction });

      // If this is the first payment method, make it default
      const existingMethods = await PaymentMethod.count({
        where: { userId }
      });

      if (existingMethods === 1) {
        await this.setDefaultPaymentMethod(userId, savedPaymentMethod.id, transaction);
      }

      await transaction.commit();
      return savedPaymentMethod;
    } catch (error) {
      await transaction.rollback();
      console.error('Error in addPaymentMethod:', error);
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

  // NEW METHOD: Retrieve a SetupIntent by ID
  async retrieveSetupIntent(setupIntentId) {
    try {
      const setupIntent = await stripe.setupIntents.retrieve(setupIntentId);
      return setupIntent;
    } catch (error) {
      console.error('Error retrieving setup intent:', error);
      throw error;
    }
  }

  // NEW METHOD: Create a PaymentMethod record from an already attached PaymentMethod
  async createPaymentMethodFromSetupIntent(userId, stripePaymentMethodId) {
    const transaction = await StripeCustomer.sequelize.transaction();
    try {
      // No need to attach again since the PaymentMethod is already attached via PaymentSheet
      const paymentMethod = await stripe.paymentMethods.retrieve(stripePaymentMethodId);
      const { card } = paymentMethod;

      // Save payment method in database
      const savedPaymentMethod = await PaymentMethod.create({
        userId,
        stripePaymentMethodId: paymentMethod.id,
        type: paymentMethod.type,
        last4: card.last4,
        brand: card.brand,
        isDefault: false
      }, { transaction });

      // If this is the first payment method, make it default
      const existingMethods = await PaymentMethod.count({
        where: { userId }
      });
      if (existingMethods === 1) {
        await this.setDefaultPaymentMethod(userId, savedPaymentMethod.id, transaction);
      }
      await transaction.commit();
      return savedPaymentMethod;
    } catch (error) {
      await transaction.rollback();
      console.error('Error creating payment method from setup intent:', error);
      throw error;
    }
  }
}

// Create an instance and export it
const stripeService = new StripeService();
module.exports = stripeService;
