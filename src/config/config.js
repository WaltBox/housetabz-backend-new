require('dotenv').config(); // Load environment variables from .env file

console.log(`Connecting to database at: ${process.env.DATABASE_URL}`);

module.exports = {
  port: process.env.PORT || 3000, // Port for the server to run on
  nodeEnv: process.env.NODE_ENV || 'development', // Node environment (e.g., development, production)
  databaseUrl: process.env.DATABASE_URL || 'postgres://postgres:6490Hill@localhost:5432/housetabz_db', // Database connection URL
};
