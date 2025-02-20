'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First make stagedRequestId nullable
    await queryInterface.changeColumn('ServiceRequestBundles', 'stagedRequestId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'StagedRequests',
        key: 'id'
      }
    });

    // Then add virtualCardRequestId
    await queryInterface.addColumn('ServiceRequestBundles', 'virtualCardRequestId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'VirtualCardRequests',
        key: 'id'
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    // First remove virtualCardRequestId
    await queryInterface.removeColumn('ServiceRequestBundles', 'virtualCardRequestId');

    // Then make stagedRequestId non-nullable again
    await queryInterface.changeColumn('ServiceRequestBundles', 'stagedRequestId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'StagedRequests',
        key: 'id'
      }
    });
  }
};