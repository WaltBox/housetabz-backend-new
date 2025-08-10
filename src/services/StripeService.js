// Load environment variables from .env (ensure you have 'dotenv' installed)
require('dotenv').config();

// Ensure the Stripe secret key is provided
const stripeSecretKey = process.env.STRIPE_SECRET_KEY;
if (!stripeSecretKey) {
  console.error("Error: STRIPE_SECRET_KEY environment variable is not set.");
  throw new Error("STRIPE_SECRET_KEY is required.");
}

// Log a masked version of the key for debugging purposes


const stripe = require('stripe')(stripeSecretKey);
const { StripeCustomer, PaymentMethod, User } = require('../models');
const { Op } = require('sequelize');

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
        metadata: { userId: user.id }
      });
  
      // Try to create, but handle the case where another request already created it
      try {
        stripeCustomer = await StripeCustomer.create({
          userId: user.id,
          stripeCustomerId: customer.id
        });
      } catch (error) {
        if (error.name === 'SequelizeUniqueConstraintError') {
          // Another request already created it, fetch it instead
        
          stripeCustomer = await StripeCustomer.findOne({ where: { userId } });
          if (!stripeCustomer) {
            throw new Error('Failed to create or find Stripe customer');
          }
        } else {
          throw error;
        }
      }
  
      return stripeCustomer;
    } catch (error) {
      console.error('Error in getOrCreateCustomer:', error);
      throw error;
    }
  }

  async processPayment({ amount, userId, paymentMethodId, metadata }, idempotencyKey) {
    try {
      const stripeCustomer = await this.getOrCreateCustomer(userId);
      let selectedPaymentMethod;

      // If no payment method is provided, use the user's default payment method
      if (!paymentMethodId) {
        const defaultPaymentMethod = await PaymentMethod.findOne({
          where: { userId, isDefault: true }
        });
        
        if (!defaultPaymentMethod) {
          throw new Error('No payment method provided and no default payment method found');
        }
        
        selectedPaymentMethod = defaultPaymentMethod.stripePaymentMethodId;
        console.log(`Using default payment method for user ${userId}: ${selectedPaymentMethod}`);
      } else {
        // Try to use the provided payment method
        const stripePaymentMethodId = String(paymentMethodId);
        
        if (stripePaymentMethodId.startsWith('pm_')) {
          // Direct Stripe payment method ID
          selectedPaymentMethod = stripePaymentMethodId;
        } else {
          // Database payment method ID
          const dbPaymentMethod = await PaymentMethod.findOne({
            where: { userId, id: parseInt(stripePaymentMethodId, 10) }
          });
          
          if (!dbPaymentMethod) {
            // If provided payment method is not found, fall back to default
            console.log(`Payment method ${paymentMethodId} not found for user ${userId}, falling back to default`);
            
            const defaultPaymentMethod = await PaymentMethod.findOne({
              where: { userId, isDefault: true }
            });
            
            if (!defaultPaymentMethod) {
              throw new Error('Payment method not found or unauthorized and no default payment method available');
            }
            
            selectedPaymentMethod = defaultPaymentMethod.stripePaymentMethodId;
            console.log(`Using default payment method as fallback for user ${userId}: ${selectedPaymentMethod}`);
          } else {
            selectedPaymentMethod = dbPaymentMethod.stripePaymentMethodId;
          }
        }
      }

      // Check if the selected payment method is a fake HouseTabz payment method
      if (selectedPaymentMethod.includes('housetabz')) {
        // Find a real payment method to use instead
        const realPaymentMethod = await PaymentMethod.findOne({
          where: { 
            userId, 
            stripePaymentMethodId: { [Op.not]: { [Op.like]: '%housetabz%' } }
          },
          order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
        });

        if (!realPaymentMethod) {
          throw new Error('Cannot process payment with fake HouseTabz payment method and no real payment methods available');
        }

        selectedPaymentMethod = realPaymentMethod.stripePaymentMethodId;
        console.log(`Replaced fake HouseTabz payment method with real payment method for user ${userId}: ${selectedPaymentMethod}`);
      }

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

      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomer.stripeCustomerId,
        automatic_payment_methods: {
          enabled: true,
          allow_redirects: 'never' // Optional: keeps it to instant payment methods
        },
        usage: 'off_session'
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
  
     
      const paymentMethod = await stripe.paymentMethods.attach(paymentMethodId, {
        customer: stripeCustomer.stripeCustomerId
      });
  
      // Handle different payment method types
      let last4 = null;
      let brand = null;
  
      if (paymentMethod.type === 'card' && paymentMethod.card) {
        last4 = paymentMethod.card.last4;
        brand = paymentMethod.card.brand;
      } else if (paymentMethod.type === 'link' && paymentMethod.link) {
        // Link doesn't have last4/brand in the same way
        last4 = null;
        brand = 'link';
      } else if (paymentMethod.type === 'cashapp' && paymentMethod.cashapp) {
        last4 = null;
        brand = 'cashapp';
      }
  
      const savedPaymentMethod = await PaymentMethod.create({
        userId,
        stripeCustomerId: stripeCustomer.id,
        stripePaymentMethodId: paymentMethod.id,
        type: paymentMethod.type,
        last4: last4,
        brand: brand || paymentMethod.type, // Fallback to payment method type
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
    
      // Only update Stripe if it's a real Stripe payment method (not a fake HouseTabz one)
      if (!paymentMethod.stripePaymentMethodId.includes('housetabz')) {
        try {
          await stripe.customers.update(stripeCustomer.stripeCustomerId, {
            invoice_settings: { default_payment_method: paymentMethod.stripePaymentMethodId }
          });
        } catch (stripeError) {
          console.log(`Warning: Could not update Stripe default payment method for ${paymentMethod.stripePaymentMethodId}:`, stripeError.message);
          // Continue with database update even if Stripe update fails
        }
      } else {
        console.log(`Skipping Stripe update for fake HouseTabz payment method: ${paymentMethod.stripePaymentMethodId}`);
      }

      // Always update our database regardless of Stripe update success
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

  /**
   * Creates a payment intent for consent-based payments (authorize but don't capture)
   * Used when users accept staged requests - they consent to be charged later
   */
  async createPaymentIntentForConsent({ amount, userId, paymentMethodId, metadata }, idempotencyKey) {
    try {
      const stripeCustomer = await this.getOrCreateCustomer(userId);
      
      // Get payment method (use provided one or default)
      let selectedPaymentMethod = paymentMethodId;
      if (!selectedPaymentMethod) {
        const paymentMethod = await PaymentMethod.findOne({
          where: { userId, isDefault: true },
          order: [['createdAt', 'DESC']]
        });

        if (!paymentMethod) {
          const fallbackPaymentMethod = await PaymentMethod.findOne({
            where: { userId },
            order: [['createdAt', 'DESC']]
          });

          if (!fallbackPaymentMethod) {
            throw new Error('No payment method found for user');
          }

          selectedPaymentMethod = fallbackPaymentMethod.stripePaymentMethodId;
        } else {
          selectedPaymentMethod = paymentMethod.stripePaymentMethodId;
        }
      }

      // Check if the selected payment method is a fake HouseTabz payment method
      if (selectedPaymentMethod.includes('housetabz')) {
        // Find a real payment method to use instead
        const realPaymentMethod = await PaymentMethod.findOne({
          where: { 
            userId, 
            stripePaymentMethodId: { [Op.not]: { [Op.like]: '%housetabz%' } }
          },
          order: [['isDefault', 'DESC'], ['createdAt', 'DESC']]
        });

        if (!realPaymentMethod) {
          throw new Error('Cannot process payment with fake HouseTabz payment method and no real payment methods available');
        }

        selectedPaymentMethod = realPaymentMethod.stripePaymentMethodId;
        console.log(`Replaced fake HouseTabz payment method with real payment method for user ${userId}: ${selectedPaymentMethod}`);
      }

      // Create payment intent with manual capture - this authorizes but doesn't charge
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert dollars to cents
        currency: 'usd',
        customer: stripeCustomer.stripeCustomerId,
        payment_method: selectedPaymentMethod,
        capture_method: 'manual', // 🔑 KEY: Don't charge immediately
        confirmation_method: 'automatic',
        confirm: true,
        metadata,
        off_session: true,
        payment_method_types: ['card']
      }, { idempotencyKey });

      console.log(`Payment intent created for consent - User ${userId}: ${paymentIntent.id} (Status: ${paymentIntent.status})`);
      return paymentIntent;
    } catch (error) {
      console.error('Error creating payment intent for consent:', error);
      throw error;
    }
  }

  /**
   * Captures a previously authorized payment intent
   * Used when all roommates have consented and we're ready to charge everyone
   */
  async capturePaymentIntent(paymentIntentId, amountToCapture = null) {
    try {
      const captureParams = {};
      if (amountToCapture) {
        captureParams.amount_to_capture = Math.round(amountToCapture * 100);
      }

      const paymentIntent = await stripe.paymentIntents.capture(paymentIntentId, captureParams);
      console.log(`Payment intent captured: ${paymentIntentId} (Status: ${paymentIntent.status})`);
      return paymentIntent;
    } catch (error) {
      console.error('Error capturing payment intent:', error);
      throw error;
    }
  }

  /**
   * Cancels an uncaptured payment intent
   * Used when someone declines the staged request
   */
  async cancelPaymentIntent(paymentIntentId) {
    try {
      const paymentIntent = await stripe.paymentIntents.cancel(paymentIntentId);
      console.log(`Payment intent cancelled: ${paymentIntentId} (Status: ${paymentIntent.status})`);
      return paymentIntent;
    } catch (error) {
      console.error('Error cancelling payment intent:', error);
      throw error;
    }
  }

  /**
   * Captures multiple payment intents simultaneously
   * Used for the final step when everyone has consented
   */
  async captureMultiplePaymentIntents(paymentIntentIds) {
    try {
      const capturePromises = paymentIntentIds.map(id => this.capturePaymentIntent(id));
      const results = await Promise.allSettled(capturePromises);
      
      const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      const failed = results.filter(r => r.status === 'rejected').map((r, index) => ({
        paymentIntentId: paymentIntentIds[index],
        error: r.reason
      }));

      if (failed.length > 0) {
        console.error('Some payment intents failed to capture:', failed);
        // In a real scenario, you might want to handle partial failures differently
        throw new Error(`Failed to capture ${failed.length} out of ${paymentIntentIds.length} payment intents`);
      }

      console.log(`Successfully captured ${successful.length} payment intents`);
      return successful;
    } catch (error) {
      console.error('Error capturing multiple payment intents:', error);
      throw error;
    }
  }

  /**
   * Cancels multiple payment intents simultaneously
   * Used when someone declines and we need to cancel all pending authorizations
   */
  async cancelMultiplePaymentIntents(paymentIntentIds) {
    try {
      const cancelPromises = paymentIntentIds.map(id => this.cancelPaymentIntent(id));
      const results = await Promise.allSettled(cancelPromises);
      
      const successful = results.filter(r => r.status === 'fulfilled').map(r => r.value);
      const failed = results.filter(r => r.status === 'rejected').map((r, index) => ({
        paymentIntentId: paymentIntentIds[index],
        error: r.reason
      }));

      // For cancellations, we're more lenient with failures since some might already be expired
      console.log(`Cancelled ${successful.length} payment intents, ${failed.length} failed`);
      return { successful, failed };
    } catch (error) {
      console.error('Error cancelling multiple payment intents:', error);
      throw error;
    }
  }
}

const stripeService = new StripeService();
module.exports = stripeService;
