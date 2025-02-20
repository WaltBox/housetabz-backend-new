'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('VirtualCards', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      stripeCardId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      virtualCardRequestId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'VirtualCardRequests',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      houseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Houses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      last4: {
        type: Sequelize.STRING,
        allowNull: false
      },
      expMonth: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      expYear: {
        type: Sequelize.INTEGER,
        allowNull: false
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'active'
      },
      monthlyLimit: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
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

    // Add indexes
    await queryInterface.addIndex('VirtualCards', ['houseId']);
    await queryInterface.addIndex('VirtualCards', ['virtualCardRequestId']);
    await queryInterface.addIndex('VirtualCards', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('VirtualCards');
  }
};