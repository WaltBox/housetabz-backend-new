// migrations/YYYYMMDDHHMMSS-add-type-to-service-request-bundle.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ServiceRequestBundles', 'type', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'marketplace_onetime',
      validate: {
        isIn: [['marketplace_onetime', 'fixed_recurring', 'variable_recurring']]
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeColumn('ServiceRequestBundles', 'type');
  }
};