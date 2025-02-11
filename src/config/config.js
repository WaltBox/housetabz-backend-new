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
    logging: true, // Enable logging for debugging
  },

  development_local: {
    url: process.env.DATABASE_URL_LOCAL,
    dialect: 'postgres',
    dialectOptions: {}, // No SSL needed for local development
    logging: true, // Enable logging for debugging
  },

  test: {
    url: 'postgresql://postgres:6490Hill@localhost/housetabz_db',
    dialect: 'postgres',
    logging: false, // Disable logging during tests for cleaner output
    dialectOptions: {}, // No SSL for local testing
  },

  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false,
      },
    },
    logging: false, // Disable logging in production
  },
};


// NODE_ENV=development_local node src/app.js start script for development_local
// zip -r app.zip . -x node_modules/\* .env

// npx sequelize-cli db:migrate --env development_local
// npx sequelize-cli migration:generate --name add-idempotency-key-to-payments.js