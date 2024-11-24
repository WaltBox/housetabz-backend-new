const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/config');

const sequelize = new Sequelize(config.databaseUrl, {
  dialect: 'postgres',
  logging: console.log,
});

// Import models and initialize them with sequelize and DataTypes
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

// Setup associations
Object.values(models).forEach((model) => {
  if (model.associate) {
    model.associate(models); // Call the associate function if defined
  }
});

// Add Sequelize and sequelize instance to the exported db object
const db = {
  ...models,
  sequelize,
  Sequelize,
};

module.exports = db;
