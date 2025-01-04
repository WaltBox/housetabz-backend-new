'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('Partners', 'api_key');
    await queryInterface.removeColumn('Partners', 'secret_key');
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Partners', 'api_key', {
      type: Sequelize.STRING,
      allowNull: false,
    });
    await queryInterface.addColumn('Partners', 'secret_key', {
      type: Sequelize.STRING,
      allowNull: false,
    });
  },
};
