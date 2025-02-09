// src/services/StripeService.js
const stripe = require('stripe')(process.env.STRIPE_SECRET_KEY);
const { StripeCustomer, PaymentMethod, User, Payment, ServiceRequestBundle } = require('../models');

class StripeService {
  /**
   * Process a payment for a task
   */
  async processPayment({ amount, userId, paymentMethodId, metadata = {} }) {
    try {
      const stripeCustomer = await this.getOrCreateCustomer(userId);

      // Create payment intent
      const paymentIntent = await stripe.paymentIntents.create({
        amount: Math.round(amount * 100), // Convert to cents
        currency: 'usd',
        customer: stripeCustomer.stripeCustomerId,
        payment_method: paymentMethodId,
        confirm: true,
        metadata,
        off_session: true,
        confirm_method: 'automatic'
      });

      return paymentIntent;
    } catch (error) {
      console.error('Error processing payment:', error);
      throw error;
    }
  }

  /**
   * Create a setup intent for adding a payment method
   */
  async createSetupIntent(userId) {
    try {
      const stripeCustomer = await this.getOrCreateCustomer(userId);

      const setupIntent = await stripe.setupIntents.create({
        customer: stripeCustomer.stripeCustomerId,
        usage: 'off_session'
      });

      return setupIntent;
    } catch (error) {
      console.error('Error creating setup intent:', error);
      throw error;
    }
  }

  /**
   * Update payment status based on Stripe webhook event
   */
  async handleWebhookEvent(event) {
    try {
      switch (event.type) {
        case 'payment_intent.succeeded':
          await this.handlePaymentSuccess(event.data.object);
          break;
        case 'payment_intent.payment_failed':
          await this.handlePaymentFailure(event.data.object);
          break;
        case 'setup_intent.succeeded':
          await this.handleSetupSuccess(event.data.object);
          break;
        case 'setup_intent.setup_failed':
          await this.handleSetupFailure(event.data.object);
          break;
      }
    } catch (error) {
      console.error('Error handling webhook event:', error);
      throw error;
    }
  }

  /**
   * Handle successful payment
   */
  async handlePaymentSuccess(paymentIntent) {
    const { taskId, paymentId } = paymentIntent.metadata;

    const payment = await Payment.findByPk(paymentId, {
      include: [{
        model: Task,
        as: 'task',
        include: [{
          model: ServiceRequestBundle,
          as: 'serviceRequestBundle'
        }]
      }]
    });

    if (!payment) return;

    // Update payment status
    await payment.update({
      status: 'completed',
      paymentDate: new Date()
    });

    // Update task status
    if (payment.task) {
      payment.task.paymentStatus = 'completed';
      if (payment.task.response === 'accepted') {
        payment.task.status = true;
      }
      await payment.task.save();

      // Update service request bundle if needed
      if (payment.task.serviceRequestBundle) {
        await payment.task.serviceRequestBundle.updateStatusIfAllTasksCompleted();
      }
    }
  }

  /**
   * Handle failed payment
   */
  async handlePaymentFailure(paymentIntent) {
    const { paymentId } = paymentIntent.metadata;
    const payment = await Payment.findByPk(paymentId);

    if (!payment) return;

    await payment.update({
      status: 'failed',
      errorMessage: paymentIntent.last_payment_error?.message || 'Payment failed',
      retryCount: payment.retryCount + 1
    });
  }

  /**
   * Retry failed payment
   */
  async retryPayment(paymentId) {
    const payment = await Payment.findByPk(paymentId, {
      include: ['task']
    });

    if (!payment || payment.status !== 'failed') {
      throw new Error('Invalid payment for retry');
    }

    if (payment.retryCount >= 3) {
      throw new Error('Maximum retry attempts reached');
    }

    // Process new payment attempt
    const paymentIntent = await this.processPayment({
      amount: payment.amount,
      userId: payment.userId,
      paymentMethodId: payment.stripePaymentMethodId,
      metadata: {
        taskId: payment.taskId,
        paymentId: payment.id
      }
    });

    // Update payment record
    await payment.update({
      status: 'processing',
      stripePaymentIntentId: paymentIntent.id
    });

    return payment;
  }
}

module.exports = new StripeService();