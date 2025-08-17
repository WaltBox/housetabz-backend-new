const { Sequelize } = require('sequelize');
const config = require('../config/config');
require('dotenv').config();

const environment = process.env.NODE_ENV || 'development';
const envConfig = config[environment];

if (!envConfig || !envConfig.url) {
  console.error(`Invalid or missing configuration for NODE_ENV: ${environment}`);
  process.exit(1);
}

// EMERGENCY: More conservative connection pool settings
const sequelize = new Sequelize(envConfig.url, {
  dialect: envConfig.dialect,
  dialectOptions: envConfig.dialectOptions || {},
  logging: envConfig.logging || false,
  pool: {
    max: 10,          // REDUCED: Maximum connections
    min: 2,           // REDUCED: Minimum connections
    acquire: 60000,   // INCREASED: 60 seconds to get connection
    idle: 5000,       // REDUCED: Release idle connections faster
    evict: 3000,      // INCREASED: Check for idle connections more often
    validate: (connection) => connection.isValid(), // Validate connections
    handleDisconnects: true, // Handle disconnects gracefully
    keepAlive: true, // Keep connections alive
  },
  retry: {
    max: 5,           // INCREASED: More retries
  },
  query: {
    timeout: 45000,   // INCREASED: 45 second query timeout
  },
  // Add connection validation
  validate: true,
  // Add connection testing
  dialectOptions: {
    ...envConfig.dialectOptions,
    keepAlive: true,
    statement_timeout: 45000,
    query_timeout: 45000,
    connectionTimeoutMillis: 60000,
  },
});

// Enhanced connection testing
(async () => {
  try {
    console.log('🔄 Testing database connection...');
    await sequelize.authenticate();
    console.log('✅ Database connection established successfully');
    
    // Test pool status
    const pool = sequelize.connectionManager.pool;
    console.log(`📊 Pool status - Size: ${pool.size}, Available: ${pool.available}, Using: ${pool.using}`);
    
  } catch (error) {
    console.error('❌ Database connection failed:', error.message);
    // Don't exit in production - let the app try to recover
    if (process.env.NODE_ENV !== 'production') {
      process.exit(1);
    }
  }
})();

module.exports = sequelize;