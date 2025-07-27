// migrations/YYYYMMDDHHMMSS-add-risk-fields-to-house-status-index.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add new risk assessment fields to HouseStatusIndexes table
    await queryInterface.addColumn('HouseStatusIndexes', 'lastRiskAssessment', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Date of last risk assessment'
    });

    await queryInterface.addColumn('HouseStatusIndexes', 'currentRiskFactor', {
      type: Sequelize.DECIMAL(5, 4),
      allowNull: true,
      defaultValue: 0.0000,
      comment: 'Current payment risk factor (0.0000 to 1.0000)'
    });

    await queryInterface.addColumn('HouseStatusIndexes', 'trendFactor', {
      type: Sequelize.DECIMAL(5, 4),
      allowNull: true,
      defaultValue: 1.0000,
      comment: 'Trend adjustment factor (usually 0.95 to 1.05)'
    });

    await queryInterface.addColumn('HouseStatusIndexes', 'riskMultiplier', {
      type: Sequelize.DECIMAL(5, 4),
      allowNull: true,
      defaultValue: 1.0000,
      comment: 'Final risk multiplier applied to HSI'
    });

    await queryInterface.addColumn('HouseStatusIndexes', 'unpaidChargesCount', {
      type: Sequelize.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Number of currently unpaid charges'
    });

    await queryInterface.addColumn('HouseStatusIndexes', 'unpaidAmount', {
      type: Sequelize.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
      comment: 'Total amount of unpaid charges'
    });

    await queryInterface.addColumn('HouseStatusIndexes', 'riskDetails', {
      type: Sequelize.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Detailed risk assessment breakdown'
    });

    // Add indexes for the new fields
    await queryInterface.addIndex('HouseStatusIndexes', ['lastRiskAssessment']);
  },

  async down(queryInterface, Sequelize) {
    // Remove the indexes first
    await queryInterface.removeIndex('HouseStatusIndexes', ['lastRiskAssessment']);

    // Remove the columns
    await queryInterface.removeColumn('HouseStatusIndexes', 'lastRiskAssessment');
    await queryInterface.removeColumn('HouseStatusIndexes', 'currentRiskFactor');
    await queryInterface.removeColumn('HouseStatusIndexes', 'trendFactor');
    await queryInterface.removeColumn('HouseStatusIndexes', 'riskMultiplier');
    await queryInterface.removeColumn('HouseStatusIndexes', 'unpaidChargesCount');
    await queryInterface.removeColumn('HouseStatusIndexes', 'unpaidAmount');
    await queryInterface.removeColumn('HouseStatusIndexes', 'riskDetails');
  }
};