'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up (queryInterface, Sequelize) {
    // First, add the stripePaymentIntentId column
    await queryInterface.addColumn('Tasks', 'stripePaymentIntentId', {
      type: Sequelize.STRING,
      allowNull: true,
      comment: 'Stripe Payment Intent ID for consent-based payments'
    });

    // Update the paymentStatus ENUM to include new values
    // Note: PostgreSQL requires dropping and recreating the enum
    await queryInterface.sequelize.query(`
      ALTER TYPE "enum_Tasks_paymentStatus" ADD VALUE 'authorized';
      ALTER TYPE "enum_Tasks_paymentStatus" ADD VALUE 'cancelled';
    `);
  },

  async down (queryInterface, Sequelize) {
    // Remove the stripePaymentIntentId column
    await queryInterface.removeColumn('Tasks', 'stripePaymentIntentId');

    // Note: PostgreSQL doesn't support removing enum values easily
    // In production, you'd need to recreate the enum without the new values
    // For development, this is acceptable as a placeholder
    console.warn('Reverting paymentStatus enum values requires manual intervention in production');
  }
};
