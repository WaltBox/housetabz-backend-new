'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // First, remove the enum constraint
    await queryInterface.sequelize.query('ALTER TABLE "Payments" ALTER COLUMN status DROP DEFAULT;');
    await queryInterface.sequelize.query('ALTER TABLE "Payments" ALTER COLUMN status TYPE VARCHAR USING status::VARCHAR;');
    
    // Then set it back up as a STRING with the default
    await queryInterface.changeColumn('Payments', 'status', {
      type: Sequelize.STRING,
      defaultValue: 'pending'
    });
  },

  down: async (queryInterface, Sequelize) => {
    // If you need to revert, convert back to ENUM
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Payments_status";');
    await queryInterface.sequelize.query('CREATE TYPE "enum_Payments_status" AS ENUM (\'pending\', \'processing\', \'completed\', \'failed\');');
    
    await queryInterface.changeColumn('Payments', 'status', {
      type: 'enum_Payments_status',
      defaultValue: 'pending'
    });
  }
};