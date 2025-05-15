// migrations/YYYYMMDDHHMMSS-add-is-resolved-to-urgent-messages.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('UrgentMessages', 'is_resolved', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('UrgentMessages', 'is_resolved');
  }
};