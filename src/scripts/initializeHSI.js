// scripts/initializeHSI.js
const { House, HouseStatusIndex, sequelize } = require('../models');
const hsiService = require('../services/hsiService');

async function initializeHSI() {
  const transaction = await sequelize.transaction();
  
  try {
    const houses = await House.findAll();
    console.log(`Initializing HSI for ${houses.length} houses...`);
    
    for (const house of houses) {
      console.log(`Processing house ${house.id}...`);
      await hsiService.updateHouseHSI(house.id, transaction);
    }
    
    await transaction.commit();
    console.log('HSI initialization complete!');
  } catch (error) {
    await transaction.rollback();
    console.error('Error initializing HSI:', error);
  }
}

// Run if executed directly
if (require.main === module) {
  initializeHSI()
    .then(() => process.exit(0))
    .catch(err => {
      console.error(err);
      process.exit(1);
    });
}

module.exports = { initializeHSI };