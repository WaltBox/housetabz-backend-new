// src/tests/helpers/stripeMock.js
const MOCK_PAYMENT_METHOD_ID = 'pm_mock_123';
const MOCK_CUSTOMER_ID = 'cus_mock_123';

const stripeMock = {
  paymentMethods: {
    attach: jest.fn().mockResolvedValue({
      id: MOCK_PAYMENT_METHOD_ID,
      type: 'card',
      card: {
        last4: '4242',
        brand: 'visa'
      }
    }),
    retrieve: jest.fn().mockResolvedValue({
      id: MOCK_PAYMENT_METHOD_ID,
      type: 'card',
      card: {
        last4: '4242',
        brand: 'visa'
      }
    })
  },
  customers: {
    create: jest.fn().mockResolvedValue({
      id: MOCK_CUSTOMER_ID
    }),
    update: jest.fn().mockResolvedValue({})
  },
  paymentIntents: {
    create: jest.fn().mockResolvedValue({
      id: 'pi_mock_123',
      amount: 1000,
      status: 'succeeded'
    })
  }
};

module.exports = {
  stripeMock,
  MOCK_PAYMENT_METHOD_ID,
  MOCK_CUSTOMER_ID
};