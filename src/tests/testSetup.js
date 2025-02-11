// src/tests/testSetup.js
const { sequelize } = require('../models');

// Mock process.exit so it doesn't kill our tests
process.exit = jest.fn();

beforeAll(async () => {
  try {
    await sequelize.authenticate();
    console.log('Database connection established for tests');
  } catch (error) {
    console.error('Unable to connect to the database:', error);
  }
});

afterAll(async () => {
  await sequelize.close();
});