require('dotenv').config();

module.exports = {
  databaseUrl: process.env.DATABASE_URL,
  port: process.env.PORT || 3004, // Default to 3004 if PORT is not set
  nodeEnv: process.env.NODE_ENV || 'development', // Default to development

  development: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
  },

  test: {
    url: 'postgresql://postgres:6490Hill@localhost/housetabz_db',
    dialect: 'postgres',
    logging: false, // Disable logging during tests for cleaner output
    dialectOptions: {}, // No SSL for local testing
  },
};


// zip -r app.zip . -x node_modules/\* .env