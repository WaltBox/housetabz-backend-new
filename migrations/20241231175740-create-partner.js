'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('Partners', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      about: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      important_information: {
        type: Sequelize.TEXT,
        allowNull: true,
      },
      logo: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      marketplace_cover: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      company_cover: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      avg_price: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
      registration_code: {
        type: Sequelize.STRING,
        allowNull: true,
        unique: true, // Ensure each code is unique
      },
      created_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
      updated_at: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP'),
      },
    });
  },
  down: async (queryInterface) => {
    await queryInterface.dropTable('Partners');
  },
};
