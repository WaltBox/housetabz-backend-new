const { Sequelize, DataTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

// Path to the SSL certificate in the `certs` folder at the root
const sslCertPath = path.join(__dirname, '../../certs/us-east-1-bundle.pem');

// Set up SSL options for Sequelize
let sslOptions = { require: true, rejectUnauthorized: false }; // Default options
if (fs.existsSync(sslCertPath)) {
  console.log('SSL certificate found. Using it for database connection.');
  sslOptions = { ...sslOptions, ca: fs.readFileSync(sslCertPath).toString() };
} else {
  console.warn(`SSL certificate file not found at ${sslCertPath}. Proceeding without a CA file.`);
}

// Initialize Sequelize instance
const sequelize = new Sequelize(config.development.url, {
  dialect: 'postgres',
  dialectOptions: { ssl: sslOptions },
  logging: console.log,
});

console.log('Sequelize initialized successfully.');

// Import models AFTER Sequelize instance is defined
const models = {
  User: require('./user')(sequelize, DataTypes),
  House: require('./house')(sequelize, DataTypes),
  Partner: require('./partner')(sequelize, DataTypes),
  ServicePlan: require('./servicePlan')(sequelize, DataTypes),
  ServiceRequestBundle: require('./serviceRequestBundle')(sequelize, DataTypes),
  Bill: require('./bill')(sequelize, DataTypes),
  Charge: require('./charge')(sequelize, DataTypes),
  Task: require('./task')(sequelize, DataTypes),
  RhythmOfferRequest: require('./rhythmOfferRequest')(sequelize, DataTypes),
  SparklyRequest: require('./sparklyRequest')(sequelize, DataTypes),
  CustomerValidation: require('./customerValidation')(sequelize, DataTypes),
  HouseService: require('./houseService')(sequelize, DataTypes),
  Deal: require('./deal')(sequelize, DataTypes),
  Form: require('./form')(sequelize, DataTypes), // Include the Form model
  Parameter: require('./parameter')(sequelize, DataTypes), // Include the Parameter model
  Notification: require('./notification')(sequelize, DataTypes),
};

// Setup model associations AFTER models are defined
Object.values(models).forEach((model) => {
  if (model.associate) {
    model.associate(models);
  }
});

// Export models and Sequelize instance
module.exports = {
  ...models,
  sequelize,
  Sequelize,
};
