const fs = require('fs');
const path = require('path');
const { Sequelize } = require('sequelize');
const config = require('./config');

const sslCertPath = path.join(__dirname, 'certs', 'us-east-1-bundle.pem');

const sequelize = new Sequelize(config.databaseUrl, {
  dialect: 'postgres',
  dialectOptions: {
    ssl: {
      require: true,
      rejectUnauthorized: false, // Temporarily for debugging
      ca: fs.readFileSync(sslCertPath).toString(),
    },
  },
  pool: {
    max: 5,
    min: 0,
    acquire: 30000,
    idle: 10000
  },
  logging: console.log,
});



module.exports = sequelize;