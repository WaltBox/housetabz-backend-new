const { Sequelize } = require('sequelize');
const config = require('../config/config');

// Initialize Sequelize without SSL
const sequelize = new Sequelize(config.databaseUrl, {
  dialect: 'postgres',
  dialectOptions: {}, // No SSL options
  logging: console.log, // Enable logging for debugging
});

// Test connection when the module is loaded
(async () => {
  try {
    console.log(`Connecting to database at: ${config.databaseUrl}`);
    await sequelize.authenticate();
    console.log('Database connection established successfully.');
  } catch (error) {
    console.error('Unable to connect to the database:', error.message);
    process.exit(1); // Exit on failure
  }
})();

module.exports = sequelize;
