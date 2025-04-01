// src/workers/latePaymentWorker.js
const { User, Charge, sequelize } = require('../models');
const { Op } = require('sequelize');
const hsiService = require('../services/hsiService');

async function processLateCharges() {
  const transaction = await sequelize.transaction();
  
  try {
    // Find all unpaid charges past due date
    const lateCharges = await Charge.findAll({
      where: {
        status: 'unpaid',
        dueDate: {
          [Op.lt]: new Date() // Due date in the past
        }
      },
      include: [{
        model: User,
        attributes: ['id', 'points', 'houseId']
      }]
    });
    
    // Group charges by user
    const userCharges = {};
    
    lateCharges.forEach(charge => {
      if (!userCharges[charge.userId]) {
        userCharges[charge.userId] = [];
      }
      userCharges[charge.userId].push(charge);
    });
    
    // Process each user's charges
    for (const userId in userCharges) {
      const user = await User.findByPk(userId, { transaction });
      if (!user) continue;
      
      let totalPointDeduction = 0;
      const housesToUpdate = new Set();
      
      for (const charge of userCharges[userId]) {
        const now = new Date();
        const dueDate = new Date(charge.dueDate);
        const daysPastDue = Math.floor((now - dueDate) / (1000 * 60 * 60 * 24));
        
        // Skip charges in grace period
        if (daysPastDue <= 3) continue;
        
        // Calculate point deduction
        let pointDeduction = 0;
        
        if (daysPastDue <= 7) pointDeduction = -1;
        else if (daysPastDue <= 14) pointDeduction = -3;
        else {
          const extraLateDays = daysPastDue - 14;
          const extraPenalty = Math.floor(extraLateDays / 2) + 1;
          pointDeduction = Math.max(-15, -5 - extraPenalty);
        }
        
        // Check if this exact deduction was already applied
        const previousDeductions = charge.metadata?.pointDeductions || [];
        const todayFormatted = new Date().toISOString().split('T')[0];
        
        if (!previousDeductions.some(d => 
          d.date === todayFormatted && d.points === pointDeduction
        )) {
          // Apply new deduction
          totalPointDeduction += pointDeduction;
          
          // Record this deduction in charge metadata
          const newDeductions = [
            ...previousDeductions,
            { date: todayFormatted, points: pointDeduction, daysPastDue }
          ];
          
          await charge.update({
            metadata: {
              ...charge.metadata,
              pointDeductions: newDeductions,
              latestPointDeduction: pointDeduction
            }
          }, { transaction });
          
          if (user.houseId) {
            housesToUpdate.add(user.houseId);
          }
        }
      }
      
      // Update user points if there were any deductions
      if (totalPointDeduction < 0) {
        user.points = Math.max(0, user.points + totalPointDeduction);
        await user.save({ transaction });
        
        console.log(`User ${userId} points deducted: ${totalPointDeduction}, new total: ${user.points}`);
      }
      
      // Update HSI for affected houses
      for (const houseId of housesToUpdate) {
        await hsiService.updateHouseHSI(houseId, transaction);
      }
    }
    
    await transaction.commit();
    return { processed: lateCharges.length };
    
  } catch (error) {
    await transaction.rollback();
    console.error('Error processing late charges:', error);
    throw error;
  }
}

module.exports = { processLateCharges };