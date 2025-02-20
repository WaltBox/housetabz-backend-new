'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('StripeHouseCustomers', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
      },
      houseId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'Houses',
          key: 'id'
        }
      },
      stripeCustomerId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      stripeCardholderId: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true
      },
      status: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: 'active'
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
    await queryInterface.addIndex('StripeHouseCustomers', ['houseId']);
    await queryInterface.addIndex('StripeHouseCustomers', ['stripeCustomerId']);
    await queryInterface.addIndex('StripeHouseCustomers', ['stripeCardholderId']);
  },

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('StripeHouseCustomers');
  }
};