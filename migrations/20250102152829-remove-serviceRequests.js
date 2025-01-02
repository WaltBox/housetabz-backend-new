'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Drop the ServiceRequests table
    await queryInterface.dropTable('ServiceRequests');
  },

  down: async (queryInterface, Sequelize) => {
    // Recreate the ServiceRequests table
    await queryInterface.createTable('ServiceRequests', {
      id: {
        type: Sequelize.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      serviceRequestBundleId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'ServiceRequestBundles',
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      createdAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
      updatedAt: {
        type: Sequelize.DATE,
        allowNull: false,
        defaultValue: Sequelize.fn('NOW'),
      },
    });
  },
};
