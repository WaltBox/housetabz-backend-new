// src/tests/unit/stripeService.test.js
const stripeService = require('../../services/StripeService');
const { User, StripeCustomer, PaymentMethod } = require('../../models');

// Mock stripe module
jest.mock('stripe', () => {
  return () => ({
    customers: {
      create: jest.fn().mockResolvedValue({
        id: 'cus_mock_123'
      })
    },
    paymentMethods: {
      attach: jest.fn().mockResolvedValue({
        id: 'pm_mock_123',
        type: 'card',
        card: {
          last4: '4242',
          brand: 'visa'
        }
      }),
      detach: jest.fn().mockResolvedValue({})
    },
    paymentIntents: {
      create: jest.fn().mockResolvedValue({
        id: 'pi_mock_123',
        status: 'succeeded',
        amount: 1000
      })
    }
  });
});

describe('StripeService Tests', () => {
  let testUser;

  beforeEach(async () => {
    testUser = await User.create({
      username: `test_user_${Date.now()}`,
      email: `test${Date.now()}@test.com`,
      password: 'testPassword123'
    });
  });

  afterEach(async () => {
    await PaymentMethod.destroy({ where: { userId: testUser.id } });
    await StripeCustomer.destroy({ where: { userId: testUser.id } });
    await User.destroy({ where: { id: testUser.id } });
  });

  test('should create a Stripe customer', async () => {
    const customer = await stripeService.getOrCreateCustomer(testUser.id);
    expect(customer).toBeDefined();
    expect(customer.userId).toBe(testUser.id);
  });

  test('should add a payment method', async () => {
    // First create a customer
    const customer = await stripeService.getOrCreateCustomer(testUser.id);
    
    const paymentMethod = await stripeService.addPaymentMethod(
      testUser.id,
      'pm_mock_123'
    );

    expect(paymentMethod).toBeDefined();
    expect(paymentMethod.userId).toBe(testUser.id);
    expect(paymentMethod.last4).toBe('4242');
    expect(paymentMethod.brand).toBe('visa');
  });

  test('should process a payment', async () => {
    // First create a customer and payment method
    await stripeService.getOrCreateCustomer(testUser.id);
    await stripeService.addPaymentMethod(testUser.id, 'pm_mock_123');

    const paymentIntent = await stripeService.processPayment({
      amount: 1000,
      userId: testUser.id,
      paymentMethodId: 'pm_mock_123',
      metadata: {
        taskId: 'task_123',
      }
    }, 'test_idempotency_key');

    expect(paymentIntent).toBeDefined();
    expect(paymentIntent.status).toBe('succeeded');
    expect(paymentIntent.amount).toBe(1000);
  });

  test('should remove a payment method', async () => {
    // First create a customer and payment method
    await stripeService.getOrCreateCustomer(testUser.id);
    const paymentMethod = await stripeService.addPaymentMethod(
      testUser.id,
      'pm_mock_123'
    );

    await expect(
      stripeService.removePaymentMethod(testUser.id, paymentMethod.id)
    ).resolves.not.toThrow();

    // Verify payment method was removed
    const methods = await PaymentMethod.findAll({
      where: { userId: testUser.id }
    });
    expect(methods.length).toBe(0);
  });

  test('should handle payment errors', async () => {
    await expect(
      stripeService.processPayment({
        amount: 1000,
        userId: testUser.id,
        paymentMethodId: 'invalid_pm',
        metadata: {}
      })
    ).rejects.toThrow('Payment method not found or unauthorized');
  });
});