// migrations/YYYYMMDDHHMMSS-add-idempotency-key-to-payments.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Payments', 'idempotency_key', {
      type: Sequelize.STRING,
      allowNull: true, // Initially true to handle existing records
      unique: true
    });

    await queryInterface.addIndex('Payments', ['idempotency_key']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('Payments', ['idempotency_key']);
    await queryInterface.removeColumn('Payments', 'idempotency_key');
  }
};