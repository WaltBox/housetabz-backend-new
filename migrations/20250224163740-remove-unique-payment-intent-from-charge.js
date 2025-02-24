'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Remove the unique constraint on stripePaymentIntentId.
    // The constraint name might vary; adjust the name as needed.
    await queryInterface.removeConstraint('Charges', 'Charges_stripePaymentIntentId_key');
  },

  down: async (queryInterface, Sequelize) => {
    // Re-add the unique constraint if you need to roll back.
    await queryInterface.addConstraint('Charges', {
      fields: ['stripePaymentIntentId'],
      type: 'unique',
      name: 'Charges_stripePaymentIntentId_key'
    });
  }
};
