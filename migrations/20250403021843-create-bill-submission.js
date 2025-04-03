// migrations/YYYY-MM-DD-create-bill-submission.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('BillSubmissions', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      houseServiceId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'HouseServices',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      status: {
        type: Sequelize.ENUM('pending', 'completed'),
        defaultValue: 'pending'
      },
      amount: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true
      },
      dueDate: {
        type: Sequelize.DATE,
        allowNull: false
      },
      billId: {
        type: Sequelize.INTEGER,
        allowNull: true,
        references: {
          model: 'Bills',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'SET NULL'
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

    // Add indexes for performance
    await queryInterface.addIndex('BillSubmissions', ['houseServiceId']);
    await queryInterface.addIndex('BillSubmissions', ['userId']);
    await queryInterface.addIndex('BillSubmissions', ['status']);
    await queryInterface.addIndex('BillSubmissions', ['dueDate']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('BillSubmissions');
  }
};