'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Step 1: Add the new columns
    await queryInterface.addColumn('Bills', 'baseAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true, // Initially true for existing records
    });
    
    await queryInterface.addColumn('Bills', 'serviceFeeTotal', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
    });
    
    // Step 2: For existing records, set baseAmount equal to amount
    // since historically the amount field was the base amount without fees
    await queryInterface.sequelize.query(
      'UPDATE "Bills" SET "baseAmount" = "amount" WHERE "baseAmount" IS NULL'
    );
    
    // Step 3: After setting values, make baseAmount not nullable
    await queryInterface.changeColumn('Bills', 'baseAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Original bill amount before service fees'
    });
    
    // Step 4: Add comment to serviceFeeTotal column
    await queryInterface.changeColumn('Bills', 'serviceFeeTotal', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0.00,
      comment: 'Total service fees applied to the bill'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Revert changes
    await queryInterface.removeColumn('Bills', 'baseAmount');
    await queryInterface.removeColumn('Bills', 'serviceFeeTotal');
  }
};