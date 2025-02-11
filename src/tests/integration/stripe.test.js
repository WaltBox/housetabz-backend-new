// src/tests/integration/stripe.test.js
const request = require('supertest');
const app = require('../../app');

jest.mock('../../services/S3Service'); // Mock S3 service to avoid initialization

describe('Stripe Integration', () => {
  test('root endpoint check', async () => {
    const response = await request(app).get('/');
    expect(response.status).toBe(200);
    expect(response.body.message).toBe('Welcome to HouseTabz Backend!');
  });
});