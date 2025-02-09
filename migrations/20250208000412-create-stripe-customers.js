'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('StripeCustomers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      userId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'Users',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      stripeCustomerId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      defaultPaymentMethodId: {
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

    // Add indexes
    await queryInterface.addIndex('StripeCustomers', ['userId']);
    await queryInterface.addIndex('StripeCustomers', ['stripeCustomerId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('StripeCustomers');
  }
};