'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {

    await queryInterface.addColumn('Partners', 'webhook_secret', {
      type: Sequelize.STRING,
      allowNull: true
    });

    await queryInterface.addColumn('Partners', 'webhook_enabled', {
      type: Sequelize.BOOLEAN,
      defaultValue: false
    });
  },

  async down(queryInterface, Sequelize) {
  
    await queryInterface.removeColumn('Partners', 'webhook_secret');
    await queryInterface.removeColumn('Partners', 'webhook_enabled');
  }
};