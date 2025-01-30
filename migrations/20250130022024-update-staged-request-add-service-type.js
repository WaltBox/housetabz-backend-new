// migrations/XXXXXX-update-staged-request-add-service-type.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Remove old pricing column
      await queryInterface.removeColumn('StagedRequests', 'pricing', { transaction });

      // Add new columns
      await queryInterface.addColumn('StagedRequests', 'serviceType', {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'cleaning', // Default for existing records
      }, { transaction });

      await queryInterface.addColumn('StagedRequests', 'estimatedAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      }, { transaction });

      await queryInterface.addColumn('StagedRequests', 'requiredUpfrontPayment', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      }, { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.removeColumn('StagedRequests', 'serviceType', { transaction });
      await queryInterface.removeColumn('StagedRequests', 'estimatedAmount', { transaction });
      await queryInterface.removeColumn('StagedRequests', 'requiredUpfrontPayment', { transaction });

      await queryInterface.addColumn('StagedRequests', 'pricing', {
        type: Sequelize.FLOAT,
        allowNull: false,
      }, { transaction });
    });
  }
};