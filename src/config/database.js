const { Sequelize } = require('sequelize');
const config = require('../config/config');
require('dotenv').config(); // Ensure that dotenv is configured here as well.

// Initialize Sequelize without SSL
const sequelize = new Sequelize(config.development.url, {
  dialect: 'postgres',
  dialectOptions: {}, // No SSL options
  logging: console.log, // Enable logging for debugging
});

// Test connection when the module is loaded
(async () => {
  try {
    console.log(`Connecting to database at: ${config.development.url}`);
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    process.exit(1); // Exit on failure
  }
})();

module.exports = sequelize;
