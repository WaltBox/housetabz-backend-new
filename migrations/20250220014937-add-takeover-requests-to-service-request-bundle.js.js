'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('ServiceRequestBundles', 'takeOverRequestId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'TakeOverRequests',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Add index for better query performance
    await queryInterface.addIndex('ServiceRequestBundles', ['takeOverRequestId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.removeIndex('ServiceRequestBundles', ['takeOverRequestId']);
    await queryInterface.removeColumn('ServiceRequestBundles', 'takeOverRequestId');
  }
};