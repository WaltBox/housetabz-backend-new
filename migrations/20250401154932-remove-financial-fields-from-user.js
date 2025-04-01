// migrations/YYYYMMDDHHMMSS-remove-financial-fields-from-user.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove financial columns from the User table
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.removeColumn('Users', 'balance', { transaction: t });
      await queryInterface.removeColumn('Users', 'points', { transaction: t });
      await queryInterface.removeColumn('Users', 'credit', { transaction: t });
    });
  },

  down: async (queryInterface, Sequelize) => {
    // Add the columns back if we need to roll back
    return queryInterface.sequelize.transaction(async (t) => {
      await queryInterface.addColumn('Users', 'balance', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00
      }, { transaction: t });
      
      await queryInterface.addColumn('Users', 'points', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      }, { transaction: t });
      
      await queryInterface.addColumn('Users', 'credit', {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0
      }, { transaction: t });
    });
  }
};