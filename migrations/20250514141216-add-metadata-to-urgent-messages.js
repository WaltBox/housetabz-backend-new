// migrations/YYYYMMDDHHMMSS-add-metadata-to-urgent-messages.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('UrgentMessages', 'metadata', {
      type: Sequelize.JSONB, // or Sequelize.TEXT
      allowNull: true
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('UrgentMessages', 'metadata');
  }
};