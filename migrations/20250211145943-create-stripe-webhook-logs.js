// migrations/YYYYMMDDHHMMSS-create-stripe-webhook-logs.js
'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('stripe_webhook_logs', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      stripe_event_id: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      event_type: {
        type: Sequelize.STRING,
        allowNull: false
      },
      payload: {
        type: Sequelize.JSON,
        allowNull: false
      },
      status: {
        type: Sequelize.ENUM('processing', 'completed', 'failed'),
        defaultValue: 'processing'
      },
      error: {
        type: Sequelize.TEXT,
        allowNull: true
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE
      }
    });

    // Add index on stripe_event_id for faster lookups
    await queryInterface.addIndex('stripe_webhook_logs', ['stripe_event_id']);
    // Add index on status for filtering
    await queryInterface.addIndex('stripe_webhook_logs', ['status']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('stripe_webhook_logs');
  }
};