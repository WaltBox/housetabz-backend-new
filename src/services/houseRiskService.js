// src/services/houseRiskService.js
const { User, UserFinance, HouseStatusIndex, HouseRiskHistory, Notification, Charge, sequelize } = require('../models');
const { Op } = require('sequelize');
const pushNotificationService = require('./pushNotificationService');

// Configuration constants
const SMOOTHING_ALPHA = 0.15;      // Reduced for more stability with risk factors
const WARNING_THRESHOLD = 3;       // Notify if within 3 points of dropping bracket
const GRACE_PERIOD_DAYS = 3;       // No penalty for first 3 days late
const RISK_ASSESSMENT_DAYS = 60;   // Look back 60 days for risk assessment

const houseRiskService = {
  // ============================================================================
  // MAIN HSI CALCULATION METHOD
  // ============================================================================

  /**
   * Main HSI calculation combining points-based score with risk assessment
   * This replaces the old hsiService.updateHouseHSI method
   */
  async updateHouseHSI(houseId, externalTransaction) {
    const transaction = externalTransaction || await sequelize.transaction();
    try {
      console.log(`🏠 Calculating risk-based HSI for house ${houseId}...`);

      // Get users with finance data
      const users = await User.findAll({
        where: { houseId },
        include: [{ model: UserFinance, as: 'finance', attributes: ['points'] }],
        transaction
      });
      
      if (!users.length) {
        console.log(`No users found for house ${houseId}`);
        if (!externalTransaction) await transaction.commit();
        return null;
      }

      // 1) Calculate base HSI from user points (existing logic)
      const baseHsi = this.calculateBaseHSI(users);

      // 2) Calculate comprehensive risk assessment
      const riskAssessment = await this.calculateRiskAssessment(houseId, transaction);
      
      // 3) Apply risk adjustment to base HSI
      const riskAdjustedHsi = Math.round(baseHsi * riskAssessment.finalMultiplier);
      const measured = Math.min(Math.max(riskAdjustedHsi, 0), 100);

      console.log(`📊 House ${houseId}: Base HSI=${baseHsi}, Risk Multiplier=${riskAssessment.finalMultiplier.toFixed(3)}, Risk-Adjusted=${measured}`);

      // 4) Apply exponential moving average for stability
      const smoothedHsi = await this.applySmoothingToHSI(houseId, measured, transaction);

      // 5) Calculate derived metrics
      const newBracket = Math.floor(smoothedHsi / 10);
      const feeMultiplier = this.calculateFeeMultiplier(smoothedHsi);
      const creditMultiplier = this.calculateCreditMultiplier(smoothedHsi);

      // 6) Update current state in database
      const hsi = await this.updateCurrentHSIState(houseId, {
        score: smoothedHsi,
        bracket: newBracket,
        feeMultiplier,
        creditMultiplier,
        riskAssessment,
        updateReason: this.generateUpdateReason(baseHsi, riskAssessment, smoothedHsi)
      }, transaction);

      // 7) Handle historical snapshots
      await this.manageHistoricalSnapshots(houseId, hsi, riskAssessment, transaction);

      // 8) Check for warnings and notifications
      await this.handleHSIWarnings(houseId, smoothedHsi, newBracket, transaction);

      if (!externalTransaction) await transaction.commit();
      
      console.log(`✅ HSI updated for house ${houseId}: score=${smoothedHsi}, bracket=${newBracket}`);
      return hsi;

    } catch (err) {
      if (!externalTransaction) await transaction.rollback();
      console.error(`❌ Error updating HSI for house ${houseId}:`, err);
      throw err;
    }
  },

  // ============================================================================
  // BASE HSI CALCULATION (FROM USER POINTS)
  // ============================================================================

  /**
   * Calculate base HSI - all houses start at neutral 50
   * Group dynamics and payment behavior drive changes from here
   */
  calculateBaseHSI(users) {
    // Always start at neutral - group payment behavior will drive changes
    return 50;
  },

  // ============================================================================
  // RISK ASSESSMENT CALCULATIONS
  // ============================================================================

  /**
   * Calculate comprehensive risk assessment
   */
  async calculateRiskAssessment(houseId, transaction) {
    const now = new Date();
    const assessmentPeriod = new Date(now.getTime() - (RISK_ASSESSMENT_DAYS * 24 * 60 * 60 * 1000));
    const thirtyDaysAgo = new Date(now.getTime() - (30 * 24 * 60 * 60 * 1000));

    // Get all charges for house users in the assessment period
    const charges = await Charge.findAll({
      where: {
        createdAt: { [Op.gte]: assessmentPeriod }
      },
      include: [{
        model: User,
        where: { houseId },
        attributes: ['id']
      }],
      transaction
    });

    if (charges.length === 0) {
      console.log(`🔍 No charges found for house ${houseId} in assessment period, using neutral risk`);
      return {
        currentRiskFactor: 0.0,
        trendFactor: 1.0,
        finalMultiplier: 1.0,
        unpaidChargesCount: 0,
        unpaidAmount: 0,
        details: {
          totalCharges: 0,
          message: 'No charges in assessment period'
        }
      };
    }

    // 1) Calculate current payment risk
    const currentRisk = this.calculateCurrentPaymentRisk(charges, now);
    
    // 2) Calculate trend factor
    const trendFactor = this.calculateTrendFactor(charges, now, thirtyDaysAgo);
    
    // 3) Convert to risk multiplier
    const baseMultiplier = this.convertRiskToMultiplier(currentRisk.riskFactor);
    const finalMultiplier = Math.max(0.85, Math.min(1.05, baseMultiplier * trendFactor));

    console.log(`📈 House ${houseId} Risk: Current=${currentRisk.riskFactor.toFixed(3)}, Trend=${trendFactor.toFixed(3)}, Final Multiplier=${finalMultiplier.toFixed(3)}`);
    
    return {
      currentRiskFactor: currentRisk.riskFactor,
      trendFactor,
      finalMultiplier,
      unpaidChargesCount: currentRisk.unpaidCount,
      unpaidAmount: currentRisk.unpaidAmount,
      details: {
        totalCharges: charges.length,
        totalAmount: currentRisk.totalAmount,
        weightedUnpaidAmount: currentRisk.weightedUnpaidAmount,
        averageDaysLate: currentRisk.averageDaysLate,
        assessmentPeriodDays: RISK_ASSESSMENT_DAYS
      }
    };
  },

  /**
   * Calculate current GROUP payment risk based on collective house behavior
   * This is where the group dynamic magic happens
   */
  calculateCurrentPaymentRisk(charges, now) {
    let totalChargeAmount = 0;
    let weightedUnpaidAmount = 0;
    let unpaidCharges = [];
    let totalDaysLate = 0;
    let lateChargesCount = 0;

    // Group analysis: Look at ALL house charges collectively
    charges.forEach(charge => {
      const chargeAmount = parseFloat(charge.amount);
      totalChargeAmount += chargeAmount;

      if (charge.status === 'unpaid') {
        const daysPastDue = Math.floor((now - new Date(charge.dueDate)) / (1000 * 60 * 60 * 24));
        
        unpaidCharges.push({
          id: charge.id,
          amount: chargeAmount,
          daysPastDue,
          userId: charge.userId
        });

        if (daysPastDue > GRACE_PERIOD_DAYS) {
          // GROUP IMPACT: One person's late payment affects entire house risk
          const timeMultiplier = this.calculateTimeMultiplier(daysPastDue);
          const weightedAmount = chargeAmount * timeMultiplier;
          weightedUnpaidAmount += weightedAmount;
          
          totalDaysLate += daysPastDue;
          lateChargesCount++;
        } else {
          // Still unpaid but within grace period - still affects group
          weightedUnpaidAmount += chargeAmount;
        }
      }
    });

    // GROUP RISK CALCULATION: What % of house's total financial obligation is at risk?
    const riskFactor = totalChargeAmount > 0 ? Math.min(weightedUnpaidAmount / totalChargeAmount, 1.0) : 0;
    const unpaidAmount = unpaidCharges.reduce((sum, c) => sum + c.amount, 0);
    const averageDaysLate = lateChargesCount > 0 ? Math.round(totalDaysLate / lateChargesCount) : 0;

    // GROUP INSIGHTS: How many people are contributing to the risk?
    const uniqueUsersWithUnpaidCharges = new Set(unpaidCharges.map(c => c.userId)).size;
    const totalUsers = new Set(charges.map(c => c.userId)).size;
    const userRiskRatio = totalUsers > 0 ? uniqueUsersWithUnpaidCharges / totalUsers : 0;

    console.log(`👥 GROUP RISK for house: ${(riskFactor * 100).toFixed(1)}% of charges unpaid, ${uniqueUsersWithUnpaidCharges}/${totalUsers} users with unpaid charges`);

    return {
      riskFactor,
      totalAmount: totalChargeAmount,
      unpaidAmount,
      unpaidCount: unpaidCharges.length,
      weightedUnpaidAmount,
      averageDaysLate,
      unpaidCharges,
      // GROUP-SPECIFIC METRICS
      uniqueUsersWithUnpaidCharges,
      totalUsers,
      userRiskRatio,
      groupRiskLevel: this.assessGroupRiskLevel(riskFactor, userRiskRatio)
    };
  },

  /**
   * Calculate time multiplier for late charges
   */
  calculateTimeMultiplier(daysPastDue) {
    if (daysPastDue <= GRACE_PERIOD_DAYS) return 1.0;
    if (daysPastDue <= 7) return 1.2;
    if (daysPastDue <= 14) return 1.5;
    if (daysPastDue <= 30) return 2.0;
    return 3.0; // 30+ days late gets maximum penalty
  },

  /**
   * Calculate GROUP trend factor comparing recent vs previous period
   * Group trends are more predictive than individual trends
   */
  calculateTrendFactor(charges, now, thirtyDaysAgo) {
    const sixtyDaysAgo = new Date(now.getTime() - (60 * 24 * 60 * 60 * 1000));
    
    // Separate charges into recent and previous periods
    const recentCharges = charges.filter(c => new Date(c.createdAt) >= thirtyDaysAgo);
    const previousCharges = charges.filter(c => 
      new Date(c.createdAt) >= sixtyDaysAgo && new Date(c.createdAt) < thirtyDaysAgo
    );

    if (recentCharges.length === 0 || previousCharges.length === 0) {
      return 1.0; // Neutral if insufficient data for comparison
    }

    // GROUP PAYMENT ANALYSIS: Look at group payment behavior patterns
    const recentGroupPaymentRate = recentCharges.filter(c => c.status === 'paid').length / recentCharges.length;
    const previousGroupPaymentRate = previousCharges.filter(c => c.status === 'paid').length / previousCharges.length;

    // GROUP PARTICIPATION ANALYSIS: How many users are paying vs not paying
    const recentActiveUsers = new Set(recentCharges.filter(c => c.status === 'paid').map(c => c.userId)).size;
    const recentTotalUsers = new Set(recentCharges.map(c => c.userId)).size;
    const recentUserParticipationRate = recentTotalUsers > 0 ? recentActiveUsers / recentTotalUsers : 1;

    const previousActiveUsers = new Set(previousCharges.filter(c => c.status === 'paid').map(c => c.userId)).size;
    const previousTotalUsers = new Set(previousCharges.map(c => c.userId)).size;
    const previousUserParticipationRate = previousTotalUsers > 0 ? previousActiveUsers / previousTotalUsers : 1;

    // Combine payment rate trend with user participation trend
    const paymentTrend = recentGroupPaymentRate - previousGroupPaymentRate;
    const participationTrend = recentUserParticipationRate - previousUserParticipationRate;
    const combinedTrend = (paymentTrend * 0.6) + (participationTrend * 0.4);

    console.log(`📈 GROUP TREND: Payment rate ${(recentGroupPaymentRate*100).toFixed(1)}% vs ${(previousGroupPaymentRate*100).toFixed(1)}%, Participation ${(recentUserParticipationRate*100).toFixed(1)}% vs ${(previousUserParticipationRate*100).toFixed(1)}%`);

    // Convert combined trend to multiplier (GROUP trends are more impactful)
    if (combinedTrend > 0.15) return 1.05;       // Significant group improvement
    if (combinedTrend > 0.08) return 1.02;       // Minor group improvement  
    if (combinedTrend < -0.15) return 0.93;      // Significant group decline (bigger penalty)
    if (combinedTrend < -0.08) return 0.97;      // Minor group decline
    return 1.0; // Stable group performance
  },

  /**
   * Convert GROUP risk factor to HSI multiplier
   * Accounts for the fact that group payment issues are more predictive than individual issues
   */
  convertRiskToMultiplier(riskFactor) {
    // GROUP-BASED RISK: More sensitive because group dynamics amplify risk
    if (riskFactor <= 0.03) return 1.01;         // 0-3% unpaid: Slight bonus for excellent group performance
    if (riskFactor <= 0.08) return 1.0;          // 3-8% unpaid: Neutral (normal group friction)
    if (riskFactor <= 0.15) return 0.96;         // 8-15% unpaid: Minor group issues
    if (riskFactor <= 0.25) return 0.91;         // 15-25% unpaid: Significant group payment problems
    if (riskFactor <= 0.40) return 0.86;         // 25-40% unpaid: Major group dysfunction
    return 0.82;                                 // 40%+ unpaid: Group collapse risk
  },

  /**
   * Assess overall group risk level for logging and notifications
   */
  assessGroupRiskLevel(riskFactor, userRiskRatio) {
    // Combine financial risk with user participation risk
    const combinedRisk = (riskFactor * 0.7) + (userRiskRatio * 0.3);
    
    if (combinedRisk <= 0.05) return 'EXCELLENT';    // Great group dynamics
    if (combinedRisk <= 0.15) return 'GOOD';         // Normal group function
    if (combinedRisk <= 0.30) return 'CONCERNING';   // Some group issues
    if (combinedRisk <= 0.50) return 'HIGH_RISK';    // Significant group problems
    return 'CRITICAL';                               // Group payment failure
  },

  // ============================================================================
  // HSI SMOOTHING AND DATABASE UPDATES
  // ============================================================================

  /**
   * Apply exponential moving average to HSI for stability
   */
  async applySmoothingToHSI(houseId, measuredHsi, transaction) {
    // Load previous HSI for smoothing
    const existing = await HouseStatusIndex.findOne({
      where: { houseId },
      order: [['updatedAt', 'DESC']],
      transaction
    });

    const previousHsi = existing ? existing.score : measuredHsi;

    // Apply exponential moving average
    const smoothedHsi = Math.round(
      SMOOTHING_ALPHA * measuredHsi +
      (1 - SMOOTHING_ALPHA) * previousHsi
    );

    return Math.min(Math.max(smoothedHsi, 0), 100);
  },

  /**
   * Update current HSI state in database
   */
  async updateCurrentHSIState(houseId, hsiData, transaction) {
    const updateData = {
      score: hsiData.score,
      bracket: hsiData.bracket,
      feeMultiplier: hsiData.feeMultiplier,
      creditMultiplier: hsiData.creditMultiplier,
      updatedReason: hsiData.updateReason,
      // Risk assessment fields
      lastRiskAssessment: new Date(),
      currentRiskFactor: hsiData.riskAssessment.currentRiskFactor,
      trendFactor: hsiData.riskAssessment.trendFactor,
      riskMultiplier: hsiData.riskAssessment.finalMultiplier,
      unpaidChargesCount: hsiData.riskAssessment.unpaidChargesCount,
      unpaidAmount: hsiData.riskAssessment.unpaidAmount,
      riskDetails: hsiData.riskAssessment.details
    };

    const [hsi, created] = await HouseStatusIndex.findOrCreate({
      where: { houseId },
      defaults: {
        ...updateData,
        updatedReason: 'Initial calculation'
      },
      transaction
    });

    if (!created) {
      await hsi.update({
        ...updateData,
        updatedReason: hsiData.updateReason
      }, { transaction });
    }

    return hsi;
  },

  // ============================================================================
  // HISTORICAL SNAPSHOT MANAGEMENT
  // ============================================================================

  /**
   * Manage historical snapshots based on significance and timing
   */
  async manageHistoricalSnapshots(houseId, hsi, riskAssessment, transaction) {
    const snapshotType = this.determineSnapshotType(hsi);
    
    if (snapshotType) {
      await HouseRiskHistory.create({
        houseId,
        assessmentDate: new Date(),
        riskFactor: riskAssessment.currentRiskFactor,
        trendFactor: riskAssessment.trendFactor,
        multiplier: riskAssessment.finalMultiplier,
        hsiScore: hsi.score,
        feeMultiplier: hsi.feeMultiplier,
        snapshotType,
        metadata: {
          unpaidChargesCount: riskAssessment.unpaidChargesCount,
          unpaidAmount: riskAssessment.unpaidAmount,
          riskDetails: riskAssessment.details
        }
      }, { transaction });

      console.log(`📸 Created ${snapshotType} snapshot for house ${houseId}`);
    }
  },

  /**
   * Determine what type of snapshot to create
   */
  determineSnapshotType(hsi) {
    const now = new Date();
    const isFirstFridayOfMonth = this.isFirstFridayOfMonth(now);
    const isQuarterEnd = this.isQuarterEnd(now);
    
    // Always create weekly snapshots (will be cleaned up later)
    if (isQuarterEnd) return 'quarterly';
    if (isFirstFridayOfMonth) return 'monthly';
    return 'weekly';
  },

  /**
   * Check if current date is first Friday of the month
   */
  isFirstFridayOfMonth(date) {
    const firstOfMonth = new Date(date.getFullYear(), date.getMonth(), 1);
    const firstFriday = new Date(firstOfMonth);
    
    // Find first Friday
    while (firstFriday.getDay() !== 5) {
      firstFriday.setDate(firstFriday.getDate() + 1);
    }
    
    return date.toDateString() === firstFriday.toDateString();
  },

  /**
   * Check if current date is end of quarter
   */
  isQuarterEnd(date) {
    const month = date.getMonth();
    return month === 2 || month === 5 || month === 8 || month === 11; // Mar, Jun, Sep, Dec
  },

  // ============================================================================
  // NOTIFICATION AND WARNING SYSTEM
  // ============================================================================

  /**
   * Handle HSI warnings and notifications
   */
  async handleHSIWarnings(houseId, newHsi, newBracket, transaction) {
    // Get previous HSI to compare brackets
    const previousHsi = await HouseStatusIndex.findOne({
      where: { houseId },
      order: [['updatedAt', 'DESC']],
      transaction
    });

    if (!previousHsi) return; // No previous data to compare

    const previousBracket = Math.floor(previousHsi.score / 10);
    const lowerBoundary = newBracket * 10;
    
    const shouldWarn = newBracket < previousBracket || (newHsi - lowerBoundary) <= WARNING_THRESHOLD;
    
    if (shouldWarn) {
      await this.notifyHouseUsers(houseId, newHsi, newBracket);
    }
  },

  /**
   * Notify users about HSI warnings - emphasizing GROUP responsibility
   */
  async notifyHouseUsers(houseId, newHsi, newBracket) {
    try {
      const users = await User.findAll({ where: { houseId } });
      
      // GROUP-FOCUSED messaging
      const warningMessage = `House Status Score is ${newHsi}. Your group's payment behavior affects everyone's service fees. Please coordinate with your housemates to ensure all charges are paid promptly.`;

      for (const user of users) {
        try {
          const notification = await Notification.create({
            userId: user.id,
            message: warningMessage,
            isRead: false,
            metadata: {
              type: 'group_hsi_warning',
              houseId,
              newHsi,
              newBracket,
              groupImpact: true
            }
          });

          await pushNotificationService.sendPushNotification(user, {
            title: 'Group Payment Alert',
            message: warningMessage,
            data: {
              notificationId: notification.id,
              newHsi,
              type: 'group_hsi_warning'
            }
          });
        } catch (error) {
          console.error(`Error notifying user ${user.id} about group HSI warning:`, error);
        }
      }
      
      console.log(`🚨 Sent GROUP HSI warning to ${users.length} users in house ${houseId}`);
    } catch (error) {
      console.error('Error in notifyHouseUsers:', error);
    }
  },

  // ============================================================================
  // UTILITY METHODS
  // ============================================================================

  /**
   * Generate human-readable update reason
   */
  generateUpdateReason(baseHsi, riskAssessment, finalHsi) {
    const riskImpact = Math.abs(1.0 - riskAssessment.finalMultiplier);
    
    if (riskImpact > 0.05) {
      return riskAssessment.finalMultiplier < 1.0 
        ? 'Risk adjustment - payment issues detected' 
        : 'Risk adjustment - payment performance improving';
    }
    
    if (Math.abs(finalHsi - baseHsi) > 5) return 'Significant change in payment behavior';
    if (Math.abs(finalHsi - baseHsi) > 2) return 'Minor adjustment from payment patterns';
    return 'Weekly risk assessment update';
  },

  /**
   * Calculate fee multiplier from HSI score (existing logic)
   */
  calculateFeeMultiplier(hsiScore) {
    return 1 + ((50 - hsiScore) / 250);
  },

  /**
   * Calculate credit multiplier from HSI score (existing logic)
   */
  calculateCreditMultiplier(hsiScore) {
    return hsiScore / 50;
  },

  // ============================================================================
  // DATA CLEANUP METHODS
  // ============================================================================

  /**
   * Clean up old risk history records (called monthly)
   */
  async cleanupOldRiskHistory() {
    try {
      const sixMonthsAgo = new Date();
      sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6);

      const deletedCount = await HouseRiskHistory.destroy({
        where: {
          snapshotType: 'weekly',
          createdAt: { [Op.lt]: sixMonthsAgo }
        }
      });

      console.log(`🧹 Cleaned up ${deletedCount} old weekly risk assessment records`);
      return deletedCount;
    } catch (error) {
      console.error('Error cleaning up old risk history:', error);
      throw error;
    }
  }
};

module.exports = houseRiskService;