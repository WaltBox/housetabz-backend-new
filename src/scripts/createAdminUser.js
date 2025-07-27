// scripts/createWaltAdmin.js
require('dotenv').config();
const { Admin, sequelize } = require('../models');

const createWaltAdmin = async () => {
  try {
    await sequelize.authenticate();
   

    const adminData = {
      email: 'walt@housetabz.com',
      password: 'waltiscool', // Will be hashed by Admin model
      firstName: 'Walt',
      lastName: 'Boxwell',
      role: 'super_admin'
    };

    // Check if Walt already exists
    const existingAdmin = await Admin.findOne({ where: { email: adminData.email } });
    
    if (existingAdmin) {
    } else {
   
      
      const adminUser = await Admin.create(adminData);

    }

  } catch (error) {
    console.error('Error creating Walt admin:', error);
    
    // Handle specific errors
    if (error.name === 'SequelizeValidationError') {

      error.errors.forEach(err => {
        
      });
    }
  } finally {
    await sequelize.close();
  
  }
};

// Run the script
console.log('Creating Walt as HouseTabz admin...\n');
createWaltAdmin();