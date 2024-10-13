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
const HouseService = require('./houseService')(sequelize, DataTypes);
const ServiceRequestBundle = require('./serviceRequestBundle')(sequelize, DataTypes);  // Correct import
const Bill = require('./bill')(sequelize, DataTypes);  // Import Bill model
const Charge = require('./charge')(sequelize, DataTypes);  // Import Charge model
const Task = require('./task')(sequelize, DataTypes);  // Import Task model
const RhythmOfferRequest = require('./rhythmOfferRequest')(sequelize, DataTypes);  // Import RhythmOfferRequest model
// Add models to the db object for exporting
const db = {
  sequelize,
  Sequelize,
  User,
  House,
  Partner,
  ServicePlan,
  HouseService,
  ServiceRequestBundle,
  Task,
  Bill,
  Charge,
  RhythmOfferRequest,
};

// Setup associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
