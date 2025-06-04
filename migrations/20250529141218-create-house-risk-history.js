// migrations/YYYYMMDDHHMMSS-create-house-risk-history.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable('HouseRiskHistories', {
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
      assessmentDate: {
        type: Sequelize.DATE,
        allowNull: false,
        comment: 'Date when this risk assessment was performed'
      },
      riskFactor: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true,
        comment: 'Current payment risk factor (0.0000 to 1.0000)'
      },
      trendFactor: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true,
        comment: 'Trend adjustment factor (usually 0.95 to 1.05)'
      },
      multiplier: {
        type: Sequelize.DECIMAL(5, 4),
        allowNull: true,
        comment: 'Final risk multiplier applied to HSI'
      },
      hsiScore: {
        type: Sequelize.INTEGER,
        allowNull: true,
        validate: { min: 0, max: 100 },
        comment: 'HSI score at time of assessment'
      },
      feeMultiplier: {
        type: Sequelize.DECIMAL(4, 2),
        allowNull: true,
        comment: 'Fee multiplier calculated from HSI score'
      },
      snapshotType: {
        type: Sequelize.ENUM('weekly', 'monthly', 'quarterly', 'significant_change', 'manual'),
        allowNull: false,
        defaultValue: 'weekly',
        comment: 'Type of snapshot for retention policy'
      },
      metadata: {
        type: Sequelize.JSONB,
        allowNull: true,
        defaultValue: {},
        comment: 'Additional risk assessment details'
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
        defaultValue: Sequelize.literal('CURRENT_TIMESTAMP')
      }
    });

    // Add indexes
    await queryInterface.addIndex('HouseRiskHistories', ['houseId']);
    await queryInterface.addIndex('HouseRiskHistories', ['assessmentDate']);
    await queryInterface.addIndex('HouseRiskHistories', ['snapshotType']);
    await queryInterface.addIndex('HouseRiskHistories', ['houseId', 'assessmentDate']);
    await queryInterface.addIndex('HouseRiskHistories', ['createdAt']);
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.dropTable('HouseRiskHistories');
  }
};