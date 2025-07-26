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
  pool: {
    max: 20,          // Maximum connections in pool
    min: 5,           // Minimum connections maintained
    acquire: 30000,   // 30 seconds to get connection
    idle: 10000,      // 10 seconds before releasing idle connection
    evict: 5000,      // Check for idle connections every 5s
  },
  retry: {
    max: 3,           // Retry failed connections
  },
  query: {
    timeout: 30000,   // 30 second query timeout
  },
});

// Test connection when the module is loaded
(async () => {
  try {
  
    await sequelize.authenticate();
   
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    process.exit(1); // Exit on failure
  }
})();

module.exports = sequelize;
