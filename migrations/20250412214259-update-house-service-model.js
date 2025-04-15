'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Add new enum values for `type` safely
    await queryInterface.sequelize.transaction(async (transaction) => {
      await queryInterface.sequelize.query(
        `ALTER TABLE "HouseServices" ALTER COLUMN "type" DROP DEFAULT`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `DO $$ BEGIN
            CREATE TYPE "enum_HouseServices_type_new" AS ENUM ('fixed_recurring', 'variable_recurring', 'one_time');
          EXCEPTION
            WHEN duplicate_object THEN null;
          END $$;`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE "HouseServices"
          ALTER COLUMN "type"
          TYPE "enum_HouseServices_type_new"
          USING "type"::text::"enum_HouseServices_type_new"`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TABLE "HouseServices"
          ALTER COLUMN "type"
          SET DEFAULT 'fixed_recurring'`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `DROP TYPE IF EXISTS "enum_HouseServices_type"`,
        { transaction }
      );

      await queryInterface.sequelize.query(
        `ALTER TYPE "enum_HouseServices_type_new" RENAME TO "enum_HouseServices_type"`,
        { transaction }
      );
    });
  },

  async down(queryInterface, Sequelize) {
    // Optional rollback if needed
  }
};
