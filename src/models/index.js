const { Sequelize, DataTypes } = require('sequelize');
const config = require('../config/config');

const sequelize = new Sequelize(config.databaseUrl, {
  dialect: 'postgres',
  logging: console.log,
});

// Import models and pass sequelize and DataTypes
const User = require('./user')(sequelize, DataTypes);
const House = require('./house')(sequelize, DataTypes);
const Partner = require('./partner')(sequelize, DataTypes);
const ServicePlan = require('./servicePlan')(sequelize, DataTypes);

const ServiceRequestBundle = require('./serviceRequestBundle')(sequelize, DataTypes);
const Bill = require('./bill')(sequelize, DataTypes);
const Charge = require('./charge')(sequelize, DataTypes);
const Task = require('./task')(sequelize, DataTypes);
const RhythmOfferRequest = require('./rhythmOfferRequest')(sequelize, DataTypes);
const SparklyRequest = require('./sparklyRequest')(sequelize, DataTypes);

const CustomerValidation = require('./customerValidation')(sequelize, DataTypes);

// Add models to the db object for exporting
const db = {
  sequelize,
  Sequelize,
  User,
  House,
  Partner,
  ServicePlan,

  ServiceRequestBundle,
  Task,
  Bill,
  Charge,
  RhythmOfferRequest,
  SparklyRequest,
  
  CustomerValidation,
};

// Setup associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
