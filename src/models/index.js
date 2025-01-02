const { Sequelize, DataTypes } = require('sequelize');
const fs = require('fs');
const path = require('path');
const config = require('../config/config');

const environment = process.env.NODE_ENV || 'development';
const envConfig = config[environment];

// Initialize Sequelize instance
const sequelize = new Sequelize(envConfig.url, {
  dialect: envConfig.dialect,
  dialectOptions: envConfig.dialectOptions,
  logging: envConfig.logging,
});

const models = {};

// Dynamically load models
fs.readdirSync(__dirname)
  .filter((file) => file !== 'index.js')
  .forEach((file) => {
    const model = require(path.join(__dirname, file))(sequelize, DataTypes);
    models[model.name] = model;
  });

// Setup model associations
Object.values(models).forEach((model) => {
  if (model.associate) {
    model.associate(models);
  }
});

// Export models and Sequelize instance
module.exports = {
  ...models,
  sequelize,
  Sequelize, // Ensure Sequelize is exported here
};
