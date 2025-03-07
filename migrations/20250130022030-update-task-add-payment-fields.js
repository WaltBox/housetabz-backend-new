'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Drop any existing ENUM types (if they exist)
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_Tasks_response" CASCADE;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_Tasks_paymentStatus" CASCADE;',
        { transaction }
      );

      // Create new ENUM types
      await queryInterface.sequelize.query(
        'CREATE TYPE "enum_Tasks_response" AS ENUM (\'pending\', \'accepted\', \'rejected\');',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'CREATE TYPE "enum_Tasks_paymentStatus" AS ENUM (\'not_required\', \'pending\', \'completed\');',
        { transaction }
      );

      // Ensure any NULL values in "response" become 'pending'
      await queryInterface.sequelize.query(
        'UPDATE "Tasks" SET response = \'pending\' WHERE response IS NULL;',
        { transaction }
      );

      // Update existing values so that they match the ENUM options
      await queryInterface.sequelize.query(`
        UPDATE "Tasks" 
        SET response = CASE 
          WHEN response = 'accepted' THEN 'accepted'::text
          WHEN response = 'rejected' THEN 'rejected'::text
          ELSE 'pending'::text
        END;
      `, { transaction });

      // *** Drop the default on the "response" column ***
      await queryInterface.sequelize.query(`
        ALTER TABLE "Tasks"
        ALTER COLUMN response DROP DEFAULT;
      `, { transaction });

      // Alter the column type to the new ENUM type with explicit casting
      await queryInterface.sequelize.query(`
        ALTER TABLE "Tasks"
        ALTER COLUMN response TYPE "enum_Tasks_response"
        USING (response::text::"enum_Tasks_response");
      `, { transaction });

      // Reapply the default for "response"
      await queryInterface.sequelize.query(`
        ALTER TABLE "Tasks"
        ALTER COLUMN response SET DEFAULT 'pending';
      `, { transaction });

      // Add the new columns
      await queryInterface.addColumn('Tasks', 'paymentRequired', {
        type: Sequelize.BOOLEAN,
        defaultValue: false,
      }, { transaction });
      await queryInterface.addColumn('Tasks', 'paymentAmount', {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      }, { transaction });
      await queryInterface.addColumn('Tasks', 'paymentStatus', {
        type: Sequelize.ENUM('not_required', 'pending', 'completed'),
        defaultValue: 'not_required',
      }, { transaction });
      await queryInterface.addColumn('Tasks', 'paymentTransactionId', {
        type: Sequelize.STRING,
        allowNull: true,
      }, { transaction });
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // Remove the new columns
      await queryInterface.removeColumn('Tasks', 'paymentRequired', { transaction });
      await queryInterface.removeColumn('Tasks', 'paymentAmount', { transaction });
      await queryInterface.removeColumn('Tasks', 'paymentStatus', { transaction });
      await queryInterface.removeColumn('Tasks', 'paymentTransactionId', { transaction });

      // Revert "response" back to VARCHAR
      await queryInterface.sequelize.query(`
        ALTER TABLE "Tasks"
        ALTER COLUMN response TYPE VARCHAR(255)
        USING response::text;
      `, { transaction });

      // Drop the ENUM types
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_Tasks_response" CASCADE;',
        { transaction }
      );
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_Tasks_paymentStatus" CASCADE;',
        { transaction }
      );
    });
  }
};
