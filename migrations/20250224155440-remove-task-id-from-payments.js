'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Step 1: Add new paymentType column
    await queryInterface.addColumn('Payments', 'paymentType', {
      type: Sequelize.STRING,
      allowNull: true,
      defaultValue: 'task'
    });

    // Step 2: Update existing rows to ensure their metadata contains taskId info
    await queryInterface.sequelize.query(`
      UPDATE "Payments"
      SET "metadata" = jsonb_set(
        COALESCE("metadata", '{}'::jsonb),
        '{taskId}',
        to_jsonb("taskId")
      )
      WHERE "taskId" IS NOT NULL;
    `);

    // Step 3: Make the paymentType not nullable after data migration
    await queryInterface.changeColumn('Payments', 'paymentType', {
      type: Sequelize.STRING,
      allowNull: false,
      defaultValue: 'task'
    });

    // Step 4: Remove the taskId column
    await queryInterface.removeConstraint('Payments', 'Payments_taskId_fkey');
    await queryInterface.removeColumn('Payments', 'taskId');
  },

  async down(queryInterface, Sequelize) {
    // Step 1: Add back the taskId column
    await queryInterface.addColumn('Payments', 'taskId', {
      type: Sequelize.INTEGER,
      allowNull: true,
      references: {
        model: 'Tasks',
        key: 'id'
      }
    });

    // Step 2: Restore taskId values from metadata
    await queryInterface.sequelize.query(`
      UPDATE "Payments"
      SET "taskId" = ("metadata"->>'taskId')::integer
      WHERE "metadata" ? 'taskId';
    `);

    // Step 3: Remove the paymentType column
    await queryInterface.removeColumn('Payments', 'paymentType');
  }
};