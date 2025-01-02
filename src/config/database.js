const { Sequelize } = require('sequelize');
const config = require('../config/config');
require('dotenv').config(); // Ensure that dotenv is configured here as well.

const environment = process.env.NODE_ENV || 'development'; // Default to 'development'
const envConfig = config[environment]; // Dynamically select the configuration

if (!envConfig || !envConfig.url) {
  console.error(`Invalid or missing configuration for NODE_ENV: ${environment}`);
  process.exit(1);
}

// Initialize Sequelize with dynamic configuration
const sequelize = new Sequelize(envConfig.url, {
  dialect: envConfig.dialect,
  dialectOptions: envConfig.dialectOptions || {}, // Include SSL if defined
  logging: envConfig.logging || false, // Use environment-specific logging
});

// Test connection when the module is loaded
(async () => {
  try {
    console.log(`Connecting to database at: ${envConfig.url}`);
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    process.exit(1); // Exit on failure
  }
})();

module.exports = sequelize;
