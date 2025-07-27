// src/utils/houseRiskScheduler.js
const cron = require('node-cron');
const { House } = require('../models');
const houseRiskService = require('../services/houseRiskService');

let houseRiskJob = null;

/**
 * Start the house risk assessment scheduler
 * Runs every Friday at 3 AM to perform comprehensive risk assessment and HSI updates
 */
function startHouseRiskScheduler() {
  if (houseRiskJob) {
    
    return;
  }

  // Run every Friday at 3 AM - '0 3 * * 5'
  // For testing every 10 minutes: '*/10 * * * *'
  // For testing daily at 3 AM: '0 3 * * *'
  houseRiskJob = cron.schedule('0 3 * * 5', async () => {
   
    try {
      const result = await performWeeklyRiskAssessment();
     
    } catch (error) {
      console.error('❌ Weekly house risk assessment failed:', error);
    }
  }, {
    scheduled: true,
    timezone: "America/New_York" // Adjust to your timezone
  });


}

/**
 * Stop the house risk scheduler
 */
function stopHouseRiskScheduler() {
  if (houseRiskJob) {
    houseRiskJob.destroy();
    houseRiskJob = null;

  }
}

/**
 * Perform comprehensive risk assessment for all houses
 */
async function performWeeklyRiskAssessment() {
  try {
    // Get all houses
    const houses = await House.findAll({
      attributes: ['id', 'name'],
      order: [['id', 'ASC']]
    });

    const results = [];
    let successCount = 0;
    let failureCount = 0;
    let totalRiskAdjustments = 0;

    // Process each house
    for (const house of houses) {
      try {
        
        const hsiResult = await houseRiskService.updateHouseHSI(house.id);
        
        if (hsiResult) {
          const riskImpact = Math.abs(1.0 - hsiResult.riskMultiplier);
          if (riskImpact > 0.02) totalRiskAdjustments++; // Count significant adjustments
          
          results.push({
            houseId: house.id,
            houseName: house.name,
            hsiScore: hsiResult.score,
            bracket: hsiResult.bracket,
            feeMultiplier: hsiResult.feeMultiplier,
            riskMultiplier: hsiResult.riskMultiplier,
            unpaidChargesCount: hsiResult.unpaidChargesCount,
            unpaidAmount: hsiResult.unpaidAmount,
            riskLevel: getRiskLevel(hsiResult.currentRiskFactor),
            success: true
          });
          successCount++;
          

        } else {
          results.push({
            houseId: house.id,
            houseName: house.name,
            success: false,
            error: 'No users found or HSI calculation returned null'
          });
          failureCount++;
    
        }
      } catch (error) {
        console.error(`❌ Error assessing risk for house ${house.id}:`, error);
        results.push({
          houseId: house.id,
          houseName: house.name,
          success: false,
          error: error.message
        });
        failureCount++;
      }

      // Small delay to avoid overwhelming the database
      await new Promise(resolve => setTimeout(resolve, 100));
    }

    // Calculate summary statistics
    const successfulResults = results.filter(r => r.success);
    const avgHSI = successfulResults.length > 0 
      ? Math.round(successfulResults.reduce((sum, r) => sum + r.hsiScore, 0) / successfulResults.length)
      : 50;
    
    const highRiskHouses = successfulResults.filter(r => r.hsiScore < 40).length;
    const excellentHouses = successfulResults.filter(r => r.hsiScore >= 80).length;

    const summary = {
      totalHouses: houses.length,
      successCount,
      failureCount,
      averageHSI: avgHSI,
      highRiskHouses,
      excellentHouses,
      housesWithRiskAdjustments: totalRiskAdjustments,
      timestamp: new Date().toISOString(),
      results
    };



    return summary;

  } catch (error) {
    console.error('Error in performWeeklyRiskAssessment:', error);
    throw error;
  }
}

/**
 * Get human-readable risk level
 */
function getRiskLevel(riskFactor) {
  if (riskFactor <= 0.03) return 'EXCELLENT';
  if (riskFactor <= 0.08) return 'GOOD';
  if (riskFactor <= 0.15) return 'FAIR';
  if (riskFactor <= 0.25) return 'CONCERNING';
  if (riskFactor <= 0.40) return 'HIGH_RISK';
  return 'CRITICAL';
}

/**
 * Manually trigger house risk assessment for all houses (for testing)
 */
async function triggerRiskAssessment() {

  try {
    const result = await performWeeklyRiskAssessment();

    return result;
  } catch (error) {
    console.error('❌ Manual house risk assessment failed:', error);
    throw error;
  }
}

/**
 * Trigger risk assessment for a specific house (for testing)
 */
async function triggerHouseRiskAssessment(houseId) {

  try {
    const result = await houseRiskService.updateHouseHSI(houseId);
  
    return result;
  } catch (error) {
    console.error(`❌ Manual risk assessment failed for house ${houseId}:`, error);
    throw error;
  }
}

/**
 * Cleanup old risk history records (run monthly)
 */
async function performMonthlyCleanup() {
  console.log('🧹 Starting monthly risk history cleanup...');
  try {
    const deletedCount = await houseRiskService.cleanupOldRiskHistory();
    console.log(`✅ Monthly cleanup completed: ${deletedCount} records deleted`);
    return deletedCount;
  } catch (error) {
    console.error('❌ Monthly cleanup failed:', error);
    throw error;
  }
}

module.exports = {
  startHouseRiskScheduler,
  stopHouseRiskScheduler,
  performWeeklyRiskAssessment,
  triggerRiskAssessment,
  triggerHouseRiskAssessment,
  performMonthlyCleanup
};