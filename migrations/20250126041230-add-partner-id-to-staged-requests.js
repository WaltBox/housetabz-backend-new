'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn('StagedRequests', 'partnerId', {
      type: Sequelize.INTEGER,
      allowNull: true,  // Initially allow null to avoid problems with existing records
      references: {
        model: 'Partners',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'SET NULL'
    });

    // Update existing records to set partnerId based on partnerName
    await queryInterface.sequelize.query(`
      UPDATE "StagedRequests" sr
      SET "partnerId" = (
        SELECT id FROM "Partners" p
        WHERE p.name = sr."partnerName"
        LIMIT 1
      )
    `);

    // Now make it not nullable
    await queryInterface.changeColumn('StagedRequests', 'partnerId', {
      type: Sequelize.INTEGER,
      allowNull: false,
      references: {
        model: 'Partners',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn('StagedRequests', 'partnerId');
  }
};