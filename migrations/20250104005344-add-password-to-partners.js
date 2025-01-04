'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Partners', 'password', {
      type: Sequelize.STRING,
      allowNull: true, // Initially allow null for existing records
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Partners', 'password');
  },
};
