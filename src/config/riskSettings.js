// config/riskSettings.js
require('dotenv').config();

module.exports = {
  BASE_FRONTING_ALLOWANCE: parseInt(process.env.BASE_FRONTING_ALLOWANCE, 10) || 100
};
