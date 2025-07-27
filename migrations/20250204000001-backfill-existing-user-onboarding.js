'use strict';

module.exports = {
  async up(queryInterface, Sequelize) {
    const { Op } = require('sequelize');
    
    console.log('Starting backfill of existing user onboarding status...');
    
    try {
      // First, get all users who have houses
      const usersWithHouses = await queryInterface.sequelize.query(
        `SELECT u.id, u."houseId" 
         FROM "Users" u 
         WHERE u."houseId" IS NOT NULL 
         AND u.onboarded = false`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      console.log(`Found ${usersWithHouses.length} users with houses to check for payment methods`);

      // For each user with a house, check if they have payment methods
      const usersToUpdate = [];
      
      for (const user of usersWithHouses) {
        const paymentMethods = await queryInterface.sequelize.query(
          `SELECT id FROM "PaymentMethods" WHERE "userId" = :userId LIMIT 1`,
          {
            replacements: { userId: user.id },
            type: Sequelize.QueryTypes.SELECT
          }
        );

        if (paymentMethods.length > 0) {
          usersToUpdate.push(user.id);
          console.log(`User ${user.id} has house and payment method - will be marked as onboarded`);
        } else {
          // User has house but no payment method - set to payment step
          await queryInterface.sequelize.query(
            `UPDATE "Users" 
             SET onboarding_step = 'payment', "updatedAt" = NOW() 
             WHERE id = :userId`,
            {
              replacements: { userId: user.id },
              type: Sequelize.QueryTypes.UPDATE
            }
          );
          console.log(`User ${user.id} has house but no payment method - set to payment step`);
        }
      }

      // Update users who have both house and payment method to completed onboarding
      if (usersToUpdate.length > 0) {
        await queryInterface.sequelize.query(
          `UPDATE "Users" 
           SET onboarded = true, 
               onboarding_step = 'completed', 
               onboarded_at = NOW(),
               "updatedAt" = NOW() 
           WHERE id IN (:userIds)`,
          {
            replacements: { userIds: usersToUpdate },
            type: Sequelize.QueryTypes.UPDATE
          }
        );

        console.log(`✓ Successfully marked ${usersToUpdate.length} users as onboarded`);
      }

      // Update users who have no house to house step (should already be default, but make sure)
      const usersWithoutHouses = await queryInterface.sequelize.query(
        `UPDATE "Users" 
         SET onboarding_step = 'house', "updatedAt" = NOW() 
         WHERE "houseId" IS NULL 
         AND onboarding_step != 'house'`,
        { type: Sequelize.QueryTypes.UPDATE }
      );

      console.log('✓ Onboarding backfill completed successfully');

      // Log final stats
      const stats = await queryInterface.sequelize.query(
        `SELECT 
           onboarding_step,
           COUNT(*) as count,
           COUNT(CASE WHEN onboarded = true THEN 1 END) as onboarded_count
         FROM "Users" 
         GROUP BY onboarding_step
         ORDER BY onboarding_step`,
        { type: Sequelize.QueryTypes.SELECT }
      );

      console.log('Final onboarding stats:');
      stats.forEach(stat => {
        console.log(`  ${stat.onboarding_step}: ${stat.count} users (${stat.onboarded_count} onboarded)`);
      });

    } catch (error) {
      console.error('Error during onboarding backfill:', error);
      throw error;
    }
  },

  async down(queryInterface, Sequelize) {
    console.log('Reverting onboarding backfill - setting all users back to default state...');
    
    // Reset all users to default onboarding state
    await queryInterface.sequelize.query(
      `UPDATE "Users" 
       SET onboarded = false,
           onboarding_step = 'house',
           onboarded_at = NULL,
           "updatedAt" = NOW()`,
      { type: Sequelize.QueryTypes.UPDATE }
    );

    console.log('✓ All users reset to default onboarding state');
  }
}; 