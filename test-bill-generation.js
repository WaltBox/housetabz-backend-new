// Modified test-bill-generation.js

process.env.NODE_ENV = 'development_local';


const billService = require('./src/services/billService');
const { HouseService } = require('./src/models');
const { Op } = require('sequelize');

async function testFixedBillGeneration() {
  try {
   
    
    // Try to get just one HouseService with limited columns
    const testService = await HouseService.findOne({
      attributes: ['id', 'name'], // Just request minimal columns
      raw: true // Get raw data
    });
    
    
    
    // Try to check table structure directly
    const sequelize = require('./src/models').sequelize;
    const tableInfo = await sequelize.query(
      "SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'HouseServices'",
      { type: sequelize.QueryTypes.SELECT }
    );
    
   
    
    // Now try the original function

    const result = await billService.generateFixedRecurringBills();
  
  } catch (error) {
    console.error('Test failed with error:', error);
  }
}

testFixedBillGeneration();