'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Charges', 'baseAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true // Allow null for existing records
    });
    
    await queryInterface.addColumn('Charges', 'serviceFee', {
      type: Sequelize.DECIMAL(6, 2),
      allowNull: true // Allow null for existing records
    });
    
    await queryInterface.addColumn('Charges', 'hsiAtTimeOfCharge', {
      type: Sequelize.INTEGER,
      allowNull: true
    });
    
    await queryInterface.addColumn('Charges', 'pointsPotential', {
      type: Sequelize.INTEGER,
      allowNull: false,
      defaultValue: 2
    });
    
    // Update existing records to set baseAmount = amount, serviceFee = 0
    await queryInterface.sequelize.query(`
      UPDATE "Charges" 
      SET "baseAmount" = "amount", "serviceFee" = 0
      WHERE "baseAmount" IS NULL
    `);
    
    // Make baseAmount and serviceFee non-nullable after migrating data
    await queryInterface.changeColumn('Charges', 'baseAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false
    });
    
    await queryInterface.changeColumn('Charges', 'serviceFee', {
      type: Sequelize.DECIMAL(6, 2),
      allowNull: false,
      defaultValue: 0.00
    });
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Charges', 'baseAmount');
    await queryInterface.removeColumn('Charges', 'serviceFee');
    await queryInterface.removeColumn('Charges', 'hsiAtTimeOfCharge');
    await queryInterface.removeColumn('Charges', 'pointsPotential');
  }
};