'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Partners', 'api_key', {
      type: Sequelize.STRING,
      allowNull: true, // Initially null
    });
    await queryInterface.addColumn('Partners', 'secret_key', {
      type: Sequelize.STRING,
      allowNull: true, // Initially null
    });
    await queryInterface.addColumn('Partners', 'webhook_url', {
      type: Sequelize.STRING,
      allowNull: true,
      validate: {
        isUrl: true, // Ensure valid URL
      },
    });
  },

  down: async (queryInterface) => {
    await queryInterface.removeColumn('Partners', 'api_key');
    await queryInterface.removeColumn('Partners', 'secret_key');
    await queryInterface.removeColumn('Partners', 'webhook_url');
  },
};
