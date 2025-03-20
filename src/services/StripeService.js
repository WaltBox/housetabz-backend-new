// Load environment variables from .env (ensure you have 'dotenv' installed)
require('dotenv').config();

// Ensure the Stripe secret key is provided
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error("Error: STRIPE_SECRET_KEY environment variable is not set.");
  throw new Error("STRIPE_SECRET_KEY is required.");
}

// Log a masked version of the key for debugging purposes
console.log("Initializing Stripe with key:", stripeSecretKey.slice(0, 8) + "..." );

const stripe = require('stripe')(stripeSecretKey);
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
        console.log(`Found existing Stripe customer for user ${userId}`);
        return stripeCustomer;
      }

      // If not, create new customer
      const user = await User.findByPk(userId);
      if (!user) {
        throw new Error('User not found');
      }

      console.log(`Creating new Stripe customer for user ${user.id} with email ${user.email}`);
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { userId: user.id }
      });

      // Save customer record in the database
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
      const stripePaymentMethodId = String(paymentMethodId);
      let selectedPaymentMethod;

      if (stripePaymentMethodId.startsWith('pm_')) {
        selectedPaymentMethod = stripePaymentMethodId;
      } else {
        const dbPaymentMethod = await PaymentMethod.findOne({
          where: { userId, id: parseInt(stripePaymentMethodId, 10) }
        });
        if (!dbPaymentMethod) {
          throw new Error('Payment method not found or unauthorized');
        }
        selectedPaymentMethod = dbPaymentMethod.stripePaymentMethodId;
      }

      console.log(`Processing payment for user ${userId}: amount ${amount} USD using payment method ${selectedPaymentMethod}`);
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert dollars to cents
        currency: 'usd',
        customer: stripeCustomer.stripeCustomerId,
        payment_method: selectedPaymentMethod,
        confirm: true,
        metadata,
        off_session: true,
        payment_method_types: ['card']
      }, { idempotencyKey });

      return paymentIntent;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  async createSetupIntent(userId) {
    try {
      const stripeCustomer = await this.getOrCreateCustomer(userId);
      console.log(`Creating setup intent for user ${userId}`);
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
        order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
      });
      console.log(`Retrieved ${paymentMethods.length} payment methods for user ${userId}`);
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
      const existingMethods = await PaymentMethod.count({ where: { userId } });

      console.log(`Attaching payment method ${paymentMethodId} for user ${userId}`);
      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomer.stripeCustomerId
      });

      const { card } = paymentMethod;
      const savedPaymentMethod = await PaymentMethod.create({
        userId,
        stripeCustomerId: stripeCustomer.id,
        stripePaymentMethodId: paymentMethod.id,
        type: paymentMethod.type,
        last4: card.last4,
        brand: card.brand,
        isDefault: existingMethods === 0
      }, { transaction });

      await transaction.commit();
      return savedPaymentMethod;
    } catch (error) {
      await transaction.rollback();
      console.error('Error adding payment method:', error);
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
      console.log(`Setting default payment method for user ${userId} to ${paymentMethodId}`);
      await stripe.customers.update(stripeCustomer.stripeCustomerId, {
        invoice_settings: { default_payment_method: paymentMethod.stripePaymentMethodId }
      });

      await PaymentMethod.update({ isDefault: false }, { where: { userId }, transaction: t });
      await PaymentMethod.update({ isDefault: true }, { where: { id: paymentMethodId }, transaction: t });

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
      const paymentMethod = await PaymentMethod.findOne({ where: { id: paymentMethodId, userId } });
      if (!paymentMethod) {
        throw new Error('Payment method not found');
      }
      console.log(`Removing payment method ${paymentMethodId} for user ${userId}`);
      await stripe.paymentMethods.detach(paymentMethod.stripePaymentMethodId);
      await paymentMethod.destroy({ transaction });
      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('Error removing payment method:', error);
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
      const existingMethods = await PaymentMethod.count({ where: { userId } });
      const paymentMethod = await stripe.paymentMethods.retrieve(stripePaymentMethodId);
      const { card } = paymentMethod;
      const savedPaymentMethod = await PaymentMethod.create({
        userId,
        stripePaymentMethodId: paymentMethod.id,
        type: paymentMethod.type,
        last4: card.last4,
        brand: card.brand,
        isDefault: existingMethods === 0
      }, { transaction });
      await transaction.commit();
      return savedPaymentMethod;
    } catch (error) {
      await transaction.rollback();
      console.error('Error creating payment method from setup intent:', error);
      throw error;
    }
  }
}

const stripeService = new StripeService();
module.exports = stripeService;
