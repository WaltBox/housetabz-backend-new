'use strict';

module.exports = {
  up: async (queryInterface, Sequelize) => {
    // Add indexes for payment-related queries to improve performance
    
    try {
      // PaymentMethods table indexes
      try {
        await queryInterface.addIndex('PaymentMethods', ['userId'], {
          name: 'idx_payment_methods_user_id_prod'
        });
        console.log('✅ Created idx_payment_methods_user_id_prod');
      } catch (error) {
        if (!error.message.includes('already exists')) throw error;
        console.log('⚠️  idx_payment_methods_user_id_prod already exists');
      }
      
      try {
        await queryInterface.addIndex('PaymentMethods', ['userId', 'isDefault'], {
          name: 'idx_payment_methods_user_default_prod'
        });
        console.log('✅ Created idx_payment_methods_user_default_prod');
      } catch (error) {
        if (!error.message.includes('already exists')) throw error;
        console.log('⚠️  idx_payment_methods_user_default_prod already exists');
      }
      
      // Charges table indexes for payment queries
      try {
        await queryInterface.addIndex('Charges', ['userId', 'status'], {
          name: 'idx_charges_user_status_prod'
        });
        console.log('✅ Created idx_charges_user_status_prod');
      } catch (error) {
        if (!error.message.includes('already exists')) throw error;
        console.log('⚠️  idx_charges_user_status_prod already exists');
      }
      
      try {
        await queryInterface.addIndex('Charges', ['userId', 'status', 'dueDate'], {
          name: 'idx_charges_user_status_due_prod'
        });
        console.log('✅ Created idx_charges_user_status_due_prod');
      } catch (error) {
        if (!error.message.includes('already exists')) throw error;
        console.log('⚠️  idx_charges_user_status_due_prod already exists');
      }
      
      // StripeCustomers table index
      try {
        await queryInterface.addIndex('StripeCustomers', ['userId'], {
          name: 'idx_stripe_customers_user_id_prod'
        });
        console.log('✅ Created idx_stripe_customers_user_id_prod');
      } catch (error) {
        if (!error.message.includes('already exists')) throw error;
        console.log('⚠️  idx_stripe_customers_user_id_prod already exists');
      }
      
      // Bills table index for charge lookups
      try {
        await queryInterface.addIndex('Bills', ['houseId', 'status'], {
          name: 'idx_bills_house_status_prod'
        });
        console.log('✅ Created idx_bills_house_status_prod');
      } catch (error) {
        if (!error.message.includes('already exists')) throw error;
        console.log('⚠️  idx_bills_house_status_prod already exists');
      }
      
      console.log('✅ Payment performance indexes migration completed for production');
    } catch (error) {
      console.error('❌ Production migration failed:', error);
      throw error;
    }
  },

  down: async (queryInterface, Sequelize) => {
    // Remove the indexes in reverse order
    await queryInterface.removeIndex('Bills', 'idx_bills_house_status_prod');
    await queryInterface.removeIndex('StripeCustomers', 'idx_stripe_customers_user_id_prod');
    await queryInterface.removeIndex('Charges', 'idx_charges_user_status_due_prod');
    await queryInterface.removeIndex('Charges', 'idx_charges_user_status_prod');
    await queryInterface.removeIndex('PaymentMethods', 'idx_payment_methods_user_default_prod');
    await queryInterface.removeIndex('PaymentMethods', 'idx_payment_methods_user_id_prod');
    
    console.log('✅ Payment performance indexes removed from production');
  }
};