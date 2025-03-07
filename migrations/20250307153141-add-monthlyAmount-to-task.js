// migration file (e.g., migrations/YYYYMMDDHHMMSS-add-monthly-amount-to-tasks.js)
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Tasks', 'monthlyAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Monthly share amount for recurring services'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Tasks', 'monthlyAmount');
  }
};