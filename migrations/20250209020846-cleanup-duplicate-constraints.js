'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    try {
      // Run all operations in a transaction
      await queryInterface.sequelize.transaction(async (transaction) => {
        // Remove duplicate constraints from PaymentMethods
        await queryInterface.sequelize.query(
          'ALTER TABLE "PaymentMethods" DROP CONSTRAINT IF EXISTS "PaymentMethods_stripePaymentMethodId_key1"',
          { transaction }
        );
        await queryInterface.sequelize.query(
          'ALTER TABLE "PaymentMethods" DROP CONSTRAINT IF EXISTS "PaymentMethods_stripePaymentMethodId_key2"',
          { transaction }
        );

        // Remove duplicate constraints from StripeCustomers
        await queryInterface.sequelize.query(
          'ALTER TABLE "StripeCustomers" DROP CONSTRAINT IF EXISTS "StripeCustomers_stripeCustomerId_key1"',
          { transaction }
        );
        await queryInterface.sequelize.query(
          'ALTER TABLE "StripeCustomers" DROP CONSTRAINT IF EXISTS "StripeCustomers_stripeCustomerId_key2"',
          { transaction }
        );

        // Remove duplicate constraints from Payments
        await queryInterface.sequelize.query(
          'ALTER TABLE "Payments" DROP CONSTRAINT IF EXISTS "Payments_stripePaymentIntentId_key1"',
          { transaction }
        );
        await queryInterface.sequelize.query(
          'ALTER TABLE "Payments" DROP CONSTRAINT IF EXISTS "Payments_stripePaymentIntentId_key2"',
          { transaction }
        );
      });
    } catch (error) {
      console.error('Migration failed:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    // Since we're removing duplicate constraints, we don't need to add them back
    // The original unique constraints will remain
    return Promise.resolve();
  }
};