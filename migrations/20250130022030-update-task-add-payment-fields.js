// migrations/XXXXXX-update-task-add-payment-fields.js
'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.sequelize.transaction(async (transaction) => {
      // First drop existing enum if it exists
      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_Tasks_response" CASCADE;',
        { transaction }
      );

      await queryInterface.sequelize.query(
        'DROP TYPE IF EXISTS "enum_Tasks_paymentStatus" CASCADE;',
        { transaction }
      );

      // Create the ENUM types
      await queryInterface.sequelize.query(
        'CREATE TYPE "enum_Tasks_response" AS ENUM (\'pending\', \'accepted\', \'rejected\');',
        { transaction }
      );

      // Create payment status enum
      await queryInterface.sequelize.query(
        'CREATE TYPE "enum_Tasks_paymentStatus" AS ENUM (\'not_required\', \'pending\', \'completed\');',
        { transaction }
      );

      // Update existing null values to 'pending'
      await queryInterface.sequelize.query(
        'UPDATE "Tasks" SET response = \'pending\' WHERE response IS NULL;',
        { transaction }
      );

      // Update existing values
      await queryInterface.sequelize.query(`
        UPDATE "Tasks" 
        SET response = CASE 
          WHEN response = 'accepted' THEN 'accepted'::text
          WHEN response = 'rejected' THEN 'rejected'::text
          ELSE 'pending'::text
        END;`,
        { transaction }
      );

      // Alter the column type with proper casting
      await queryInterface.sequelize.query(`
        ALTER TABLE "Tasks" 
        ALTER COLUMN response TYPE "enum_Tasks_response" 
        USING (response::text::"enum_Tasks_response");`,
        { transaction }
      );

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
      // Remove columns
      await queryInterface.removeColumn('Tasks', 'paymentRequired', { transaction });
      await queryInterface.removeColumn('Tasks', 'paymentAmount', { transaction });
      await queryInterface.removeColumn('Tasks', 'paymentStatus', { transaction });
      await queryInterface.removeColumn('Tasks', 'paymentTransactionId', { transaction });

      // Change response back to STRING
      await queryInterface.sequelize.query(`
        ALTER TABLE "Tasks" 
        ALTER COLUMN response TYPE VARCHAR(255) 
        USING response::text;`,
        { transaction }
      );

      // Drop the enum types
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Tasks_response" CASCADE;', { transaction });
      await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Tasks_paymentStatus" CASCADE;', { transaction });
    });
  }
};