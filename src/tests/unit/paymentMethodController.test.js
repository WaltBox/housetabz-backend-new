// src/tests/unit/paymentMethodController.test.js
const paymentMethodController = require('../../controllers/paymentMethodController');
const stripeService = require('../../services/StripeService');
const { User, PaymentMethod } = require('../../models');

// Mock the stripe service
jest.mock('../../services/StripeService');

describe('Payment Method Controller Tests', () => {
  let testUser;
  let mockReq;
  let mockRes;

  beforeEach(async () => {
    // Create test user
    testUser = await User.create({
      username: `test_user_${Date.now()}`,
      email: `test${Date.now()}@test.com`,
      password: 'testPassword123'
    });

    // Setup mock request and response
    mockReq = {
      user: { id: testUser.id },
      body: {},
      params: {}
    };

    mockRes = {
      json: jest.fn(),
      status: jest.fn().mockReturnThis()
    };
  });

  afterEach(async () => {
    // Cleanup
    await PaymentMethod.destroy({ where: { userId: testUser.id } });
    await User.destroy({ where: { id: testUser.id } });
    jest.clearAllMocks();
  });

  test('first payment method should be default', async () => {
    // Mock stripeService response for first payment method
    stripeService.addPaymentMethod.mockResolvedValueOnce({
      id: 1,
      userId: testUser.id,
      isDefault: true
    });

    mockReq.body.paymentMethodId = 'pm_test_123';
    await paymentMethodController.addPaymentMethod(mockReq, mockRes);

    expect(mockRes.json).toHaveBeenCalledWith(
      expect.objectContaining({
        paymentMethod: expect.objectContaining({
          isDefault: true
        })
      })
    );
  });

  test('setting new default payment method', async () => {
    // Mock getting payment methods
    stripeService.getPaymentMethods.mockResolvedValue([
      { id: 1, isDefault: true },
      { id: 2, isDefault: false }
    ]);

    // Mock setting default
    stripeService.setDefaultPaymentMethod.mockResolvedValue({
      success: true
    });

    mockReq.params.paymentMethodId = 2;
    await paymentMethodController.setDefaultPaymentMethod(mockReq, mockRes);

    expect(stripeService.setDefaultPaymentMethod).toHaveBeenCalledWith(
      testUser.id,
      2
    );
    expect(mockRes.json).toHaveBeenCalledWith({
      message: 'Default payment method updated'
    });
  });

  test('should not allow removing last default payment method', async () => {
    // Mock getting payment methods showing only one method
    stripeService.getPaymentMethods.mockResolvedValue([
      { id: 1, isDefault: true }
    ]);

    mockReq.params.id = 1;
    await paymentMethodController.removePaymentMethod(mockReq, mockRes);

    expect(mockRes.status).toHaveBeenCalledWith(400);
    expect(mockRes.json).toHaveBeenCalledWith({
      error: 'Cannot remove the only payment method'
    });
  });
});