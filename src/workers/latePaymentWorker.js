// src/workers/latePaymentWorker.js - UPDATED (Points Only)
const { User, Charge, UserFinance, sequelize } = require('../models');
const { Op } = require('sequelize');

async function processLateCharges() {
  const transaction = await sequelize.transaction();
  try {

    
    // Find all unpaid charges past due date, including each user's finance row
    const lateCharges = await Charge.findAll({
      where: {
        status: 'unpaid',
        dueDate: { [Op.lt]: new Date() }
      },
      include: [{
        model: User,
        attributes: ['id', 'houseId', 'username'],
        include: [{
          model: UserFinance,
          as: 'finance',
          attributes: ['points']
        }]
      }]
    });

    if (lateCharges.length === 0) {
      await transaction.commit();

      return { processed: 0, message: 'No late charges to process' };
    }



    // Group by userId for efficient processing
    const userCharges = lateCharges.reduce((map, charge) => {
      (map[charge.userId] ||= []).push(charge);
      return map;
    }, {});

    let totalUsersProcessed = 0;
    let totalPointsDeducted = 0;

    for (const userId of Object.keys(userCharges)) {
      // Fetch the UserFinance row directly to update points
      const userFinance = await UserFinance.findOne({
        where: { userId },
        transaction
      });
      
      if (!userFinance) {
        console.log(`⚠️  No finance record found for user ${userId}, skipping`);
        continue;
      }

      let userPointDeduction = 0;
      const userChargesList = userCharges[userId];
      const username = userChargesList[0].User.username;

      console.log(`👤 Processing ${userChargesList.length} late charges for user ${username} (${userId})`);

      for (const charge of userChargesList) {
        const daysPastDue = Math.floor(
          (Date.now() - new Date(charge.dueDate)) / (1000*60*60*24)
        );
        
        // Grace period: No penalty for first 3 days
        if (daysPastDue <= 3) {
          console.log(`   📅 Charge ${charge.id}: ${daysPastDue} days late (within grace period)`);
          continue;
        }

        // Calculate point deduction based on days late
        let pointDeduction = 0;
        if (daysPastDue <= 7) {
          pointDeduction = -1;
          console.log(`   🟡 Charge ${charge.id}: ${daysPastDue} days late → -1 point`);
        } else if (daysPastDue <= 14) {
          pointDeduction = -3;
          console.log(`   🟠 Charge ${charge.id}: ${daysPastDue} days late → -3 points`);
        } else {
          const extra = daysPastDue - 14;
          pointDeduction = Math.max(-15, -5 - (Math.floor(extra/2) + 1));
          console.log(`   🔴 Charge ${charge.id}: ${daysPastDue} days late → ${pointDeduction} points`);
        }

        // Check if we already applied this penalty today
        const prev = charge.metadata?.pointDeductions || [];
        const today = new Date().toISOString().split('T')[0];
        const existingToday = prev.find(d => d.date === today);
        
        if (existingToday) {
          console.log(`   ⏭️  Charge ${charge.id}: Already processed today (${existingToday.points} points)`);
          continue;
        }

        // Apply the point deduction
        userPointDeduction += pointDeduction;
        const newMeta = {
          ...charge.metadata,
          pointDeductions: [...prev, { 
            date: today, 
            points: pointDeduction, 
            daysPastDue,
            processedAt: new Date().toISOString()
          }],
          latestPointDeduction: pointDeduction
        };
        
        await charge.update({ metadata: newMeta }, { transaction });
        console.log(`   ✅ Charge ${charge.id}: Applied ${pointDeduction} points penalty`);
      }

      // Apply total point deduction to user's finance record
      if (userPointDeduction < 0) {
        const oldPoints = userFinance.points;
        userFinance.points = Math.max(0, userFinance.points + userPointDeduction);
        await userFinance.save({ transaction });
        
        totalPointsDeducted += Math.abs(userPointDeduction);
        totalUsersProcessed++;
        
        console.log(`💥 User ${username}: ${oldPoints} → ${userFinance.points} points (${userPointDeduction} penalty)`);
      } else {
        console.log(`ℹ️  User ${username}: No new penalties applied`);
      }
    }

    await transaction.commit();
    
    const summary = {
      processed: lateCharges.length,
      usersAffected: totalUsersProcessed,
      totalPointsDeducted,
      message: 'Late payment penalties applied successfully'
    };

    console.log(`✅ LATE PAYMENT PROCESSING COMPLETED:`);
    console.log(`   📋 Charges processed: ${lateCharges.length}`);
    console.log(`   👥 Users affected: ${totalUsersProcessed}`);
    console.log(`   📉 Total points deducted: ${totalPointsDeducted}`);
    console.log(`   📅 HSI risk assessment will run on Friday`);

    return summary;
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Error processing late charges:', err);
    throw err;
  }
}

module.exports = { processLateCharges };