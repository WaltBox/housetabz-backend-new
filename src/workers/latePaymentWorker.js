// src/workers/latePaymentWorker.js
const { User, Charge, UserFinance, sequelize } = require('../models');
const { Op } = require('sequelize');
const hsiService = require('../services/hsiService');

async function processLateCharges() {
  const transaction = await sequelize.transaction();
  try {
    // Find all unpaid charges past due date, including each user’s finance row
    const lateCharges = await Charge.findAll({
      where: {
        status: 'unpaid',
        dueDate: { [Op.lt]: new Date() }
      },
      include: [{
        model: User,
        attributes: ['id', 'houseId'],
        include: [{
          model: UserFinance,
          as: 'finance',
          attributes: ['points']
        }]
      }]
    });

    // Group by userId
    const userCharges = lateCharges.reduce((map, charge) => {
      (map[charge.userId] ||= []).push(charge);
      return map;
    }, {});

    for (const userId of Object.keys(userCharges)) {
      // Fetch the UserFinance row directly to update points
      const userFinance = await UserFinance.findOne({
        where: { userId },
        transaction
      });
      if (!userFinance) continue;

      let totalPointDeduction = 0;
      const housesToUpdate = new Set();

      for (const charge of userCharges[userId]) {
        const daysPastDue = Math.floor(
          (Date.now() - new Date(charge.dueDate)) / (1000*60*60*24)
        );
        if (daysPastDue <= 3) continue;

        let pointDeduction = 0;
        if (daysPastDue <= 7)          pointDeduction = -1;
        else if (daysPastDue <= 14)    pointDeduction = -3;
        else {
          const extra = daysPastDue - 14;
          pointDeduction = Math.max(-15, -5 - (Math.floor(extra/2)+1));
        }

        const prev = charge.metadata?.pointDeductions || [];
        const today = new Date().toISOString().split('T')[0];
        if (!prev.some(d => d.date===today && d.points===pointDeduction)) {
          totalPointDeduction += pointDeduction;
          const newMeta = {
            ...charge.metadata,
            pointDeductions: [...prev, { date: today, points: pointDeduction, daysPastDue }],
            latestPointDeduction: pointDeduction
          };
          await charge.update({ metadata: newMeta }, { transaction });
          housesToUpdate.add(charge.User.houseId);
        }
      }

      if (totalPointDeduction < 0) {
        // Apply deduction on UserFinance.points
        userFinance.points = Math.max(0, userFinance.points + totalPointDeduction);
        await userFinance.save({ transaction });
        console.log(`User ${userId} points deducted: ${totalPointDeduction}, new total: ${userFinance.points}`);
      }

      // Recompute HSI for each affected house
      for (const houseId of housesToUpdate) {
        await hsiService.updateHouseHSI(houseId, transaction);
      }
    }

    await transaction.commit();
    return { processed: lateCharges.length };
  } catch (err) {
    await transaction.rollback();
    console.error('Error processing late charges:', err);
    throw err;
  }
}

module.exports = { processLateCharges };
