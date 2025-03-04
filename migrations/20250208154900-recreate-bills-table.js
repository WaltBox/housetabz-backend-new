'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First create the table
    await queryInterface.createTable('Bills', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false
      },
      houseService_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'HouseServices',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'NO ACTION'
      },
      houseId: {
        type: Sequelize.INTEGER,
        references: {
          model: 'Houses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'pending'
      },
      stripePaymentIntentId: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true
      },
      dueDate: {
        type: Sequelize.DATE,
        allowNull: true
      },
      metadata: {
        type: Sequelize.JSONB,
        defaultValue: {}
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

    // Then add indexes in separate transactions
    try {
      await queryInterface.addIndex('Bills', ['status'], {
        name: 'bills_status'
      });
      await queryInterface.addIndex('Bills', ['houseService_id'], {
        name: 'bills_houseservice_id'
      });
    } catch (error) {
      console.error('Error adding indexes:', error);
      // If index creation fails, we'll still have the table
    }
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('Bills');
  }
};