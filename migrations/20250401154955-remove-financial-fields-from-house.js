// migrations/YYYYMMDDHHMMSS-remove-financial-fields-from-house.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove financial columns from the House table
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeColumn('Houses', 'balance', { transaction: t });
      await queryInterface.removeColumn('Houses', 'ledger', { transaction: t });
      await queryInterface.removeColumn('Houses', 'hsi', { transaction: t });
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Add the columns back if we need to roll back
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.addColumn('Houses', 'balance', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      }, { transaction: t });
      
      await queryInterface.addColumn('Houses', 'ledger', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      }, { transaction: t });
      
      await queryInterface.addColumn('Houses', 'hsi', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      }, { transaction: t });
    });
  }
};