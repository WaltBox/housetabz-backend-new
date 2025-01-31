'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    await queryInterface.addColumn('Partners', 'logo_key', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'logo',
      comment: 'S3 key for the partner logo'
    });

    await queryInterface.addColumn('Partners', 'marketplace_cover_key', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'marketplace_cover',
      comment: 'S3 key for the marketplace cover image'
    });

    await queryInterface.addColumn('Partners', 'company_cover_key', {
      type: Sequelize.STRING,
      allowNull: true,
      after: 'company_cover',
      comment: 'S3 key for the company cover image'
    });

    // Add indexes for the new columns
    await queryInterface.addIndex('Partners', ['logo_key']);
    await queryInterface.addIndex('Partners', ['marketplace_cover_key']);
    await queryInterface.addIndex('Partners', ['company_cover_key']);
  },

  down: async (queryInterface, Sequelize) => {
    // Remove indexes first
    await queryInterface.removeIndex('Partners', ['logo_key']);
    await queryInterface.removeIndex('Partners', ['marketplace_cover_key']);
    await queryInterface.removeIndex('Partners', ['company_cover_key']);

    // Then remove the columns
    await queryInterface.removeColumn('Partners', 'logo_key');
    await queryInterface.removeColumn('Partners', 'marketplace_cover_key');
    await queryInterface.removeColumn('Partners', 'company_cover_key');
  }
};