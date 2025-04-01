'use strict';
module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.createTable('HouseStatusIndices', {
      id: {
        allowNull: false,
        autoIncrement: true,
        primaryKey: true,
        type: Sequelize.INTEGER
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
      score: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 50
      },
      bracket: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 5
      },
      feeMultiplier: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 1.0
      },
      creditMultiplier: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: false,
        defaultValue: 1.0
      },
      updatedReason: {
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
    
    await queryInterface.addIndex('HouseStatusIndices', ['houseId']);
  },
  down: async (queryInterface, Sequelize) => {
    await queryInterface.dropTable('HouseStatusIndices');
  }
};