// scripts/test-house-risk.js
require('dotenv').config();

const { sequelize } = require('../models');
const { triggerRiskAssessment, triggerHouseRiskAssessment } = require('../utils/houseRiskScheduler');

async function runHouseRiskTest() {
  try {
    console.log('🚀 TESTING HOUSE RISK ASSESSMENT');
    console.log('=================================\n');

    // Test database connection
    await sequelize.authenticate();
    console.log('✅ Database connection established\n');

    // Check command line arguments
    const args = process.argv.slice(2);
    const houseId = args[0];

    if (houseId && !isNaN(houseId)) {
      // Test specific house
      console.log(`🏠 Testing risk assessment for house ${houseId}...\n`);
      const result = await triggerHouseRiskAssessment(parseInt(houseId));
      
      console.log('\n📊 HOUSE RISK RESULTS:');
      console.log('======================');
      console.log(`House ID: ${houseId}`);
      console.log(`HSI Score: ${result.score}`);
      console.log(`Bracket: ${result.bracket}`);
      console.log(`Fee Multiplier: ${result.feeMultiplier.toFixed(3)}x`);
      console.log(`Risk Multiplier: ${result.riskMultiplier.toFixed(3)}x`);
      console.log(`Unpaid Charges: ${result.unpaidChargesCount}`);
      console.log(`Unpaid Amount: $${result.unpaidAmount}`);
      console.log(`Last Assessment: ${result.lastRiskAssessment}`);
      
    } else {
      // Test all houses
      console.log('🏘️  Testing risk assessment for ALL houses...\n');
      const result = await triggerRiskAssessment();
      
      console.log('\n📊 PORTFOLIO RISK RESULTS:');
      console.log('==========================');
      console.log(`Total houses: ${result.totalHouses}`);
      console.log(`Successfully processed: ${result.successCount}`);
      console.log(`Failed: ${result.failureCount}`);
      console.log(`Average HSI: ${result.averageHSI}`);
      console.log(`High risk houses (HSI < 40): ${result.highRiskHouses}`);
      console.log(`Excellent houses (HSI ≥ 80): ${result.excellentHouses}`);
      console.log(`Houses with risk adjustments: ${result.housesWithRiskAdjustments}`);
      
      console.log('\n🏠 INDIVIDUAL HOUSE RESULTS:');
      console.log('============================');
      result.results.forEach(house => {
        if (house.success) {
          console.log(`House ${house.houseId} (${house.houseName}): HSI=${house.hsiScore}, Risk=${house.riskLevel}, Fee=${house.feeMultiplier.toFixed(3)}x`);
        } else {
          console.log(`House ${house.houseId} (${house.houseName}): ❌ ${house.error}`);
        }
      });
    }

    process.exit(0);
  } catch (error) {
    console.error('❌ Test failed:', error);
    process.exit(1);
  }
}

// Handle graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down...');
  await sequelize.close();
  process.exit(0);
});

console.log('Usage:');
console.log('  npm run test:house-risk          # Test all houses');
console.log('  npm run test:house-risk 123      # Test specific house ID\n');

// Run the test
runHouseRiskTest();