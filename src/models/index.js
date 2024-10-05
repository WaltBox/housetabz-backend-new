// src/models/index.js
const { Sequelize, DataTypes } = require('sequelize'); // Make sure DataTypes is imported here
const config = require('../config/config');

const sequelize = new Sequelize(config.databaseUrl, {
  dialect: 'postgres',
  logging: console.log,
});

const User = require('./user')(sequelize, DataTypes);  // Pass both sequelize and DataTypes to the model
const House = require('./house')(sequelize, DataTypes); // Pass both sequelize and DataTypes to the model

const db = {
  sequelize,
  Sequelize,
  User,
  House,
};

// Setup associations
Object.keys(db).forEach((modelName) => {
  if (db[modelName].associate) {
    db[modelName].associate(db);
  }
});

module.exports = db;
