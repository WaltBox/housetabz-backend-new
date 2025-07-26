'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    // Add onboarding fields to Users table
    await queryInterface.addColumn('Users', 'onboarded', {
      type: Sequelize.BOOLEAN,
      allowNull: false,
      defaultValue: false,
      comment: 'Whether user has completed onboarding process'
    });

    await queryInterface.addColumn('Users', 'onboarding_step', {
      type: Sequelize.ENUM('house', 'payment', 'completed'),
      allowNull: false,
      defaultValue: 'house',
      comment: 'Current step in onboarding process'
    });

    await queryInterface.addColumn('Users', 'onboarded_at', {
      type: Sequelize.DATE,
      allowNull: true,
      comment: 'Timestamp when user completed onboarding'
    });

    // Add indexes for better query performance
    await queryInterface.addIndex('Users', ['onboarded'], {
      name: 'idx_users_onboarded'
    });

    await queryInterface.addIndex('Users', ['onboarding_step'], {
      name: 'idx_users_onboarding_step'
    });
  },

  async down(queryInterface, Sequelize) {
    // Remove indexes first
    await queryInterface.removeIndex('Users', 'idx_users_onboarding_step');
    await queryInterface.removeIndex('Users', 'idx_users_onboarded');

    // Remove columns
    await queryInterface.removeColumn('Users', 'onboarded_at');
    await queryInterface.removeColumn('Users', 'onboarding_step');
    await queryInterface.removeColumn('Users', 'onboarded');

    // Remove the ENUM type
    await queryInterface.sequelize.query('DROP TYPE IF EXISTS "enum_Users_onboarding_step";');
  }
}; 