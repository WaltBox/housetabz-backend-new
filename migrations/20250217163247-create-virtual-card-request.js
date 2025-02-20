'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('VirtualCardRequests', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      serviceName: {
        type: Sequelize.STRING,
        allowNull: false
      },
      serviceType: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'virtual_card'
      },
      monthlyAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      dueDate: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      requiredUpfrontPayment: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending'
      },
      virtualCardId: {
        type: Sequelize.STRING,
        allowNull: true
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('VirtualCardRequests');
  }
};