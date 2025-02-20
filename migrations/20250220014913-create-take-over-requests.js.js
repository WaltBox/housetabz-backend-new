'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('TakeOverRequests', {
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
      accountNumber: {
        type: Sequelize.STRING,
        allowNull: false
      },
      serviceType: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'take_over'
      },
      monthlyAmount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      dueDate: {
        type: Sequelize.INTEGER,
        allowNull: false,
        validate: {
          min: 1,
          max: 31
        }
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
    await queryInterface.dropTable('TakeOverRequests');
  }
};