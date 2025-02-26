'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('TakeOverRequests', 'monthlyAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Monthly recurring amount for fixed services (null for variable services)'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.changeColumn('TakeOverRequests', 'monthlyAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: false,
      comment: 'Monthly recurring amount for this service'
    });
  }
};