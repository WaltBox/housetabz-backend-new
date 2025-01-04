'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('PartnerKeys', {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
        allowNull: false,
      },
      partnerId: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: 'Partners', // Name of the Partners table
          key: 'id',
        },
        onDelete: 'CASCADE',
      },
      api_key: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      secret_key: {
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

  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('PartnerKeys');
  },
};
