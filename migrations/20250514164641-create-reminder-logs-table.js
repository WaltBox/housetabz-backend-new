// migrations/YYYYMMDDHHMMSS-create-reminder-logs-table.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('ReminderLogs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      sender_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      recipient_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Users',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      bill_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Bills',
          key: 'id'
        },
        onDelete: 'CASCADE'
      },
      message: {
        type: Sequelize.TEXT,
        allowNull: false
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add indexes for optimized queries
    await queryInterface.addIndex('ReminderLogs', {
      fields: ['sender_id', 'recipient_id', 'created_at'],
      name: 'reminder_logs_sender_recipient_created_idx'
    });

    await queryInterface.addIndex('ReminderLogs', {
      fields: ['recipient_id', 'created_at'],
      name: 'reminder_logs_recipient_created_idx'
    });
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('ReminderLogs');
  }
};