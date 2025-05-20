'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('HouseServiceLedgers', 'metadata', {
      type: Sequelize.JSONB,
      defaultValue: {},
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('HouseServiceLedgers', 'metadata');
  }
};
