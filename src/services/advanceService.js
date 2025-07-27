// src/services/advanceService.js
const { HouseStatusIndex, Transaction, Charge, Bill } = require('../models');
const { BASE_FRONTING_ALLOWANCE } = require('../config/riskSettings');

/**
 * Calculate the base advance allowance for a house based on its HSI multiplier
 * @param {number} houseId
 * @returns {Promise<number>} Rounded dollar amount of total allowance
 */
async function getAdvanceAllowance(houseId) {
  const hsi = await HouseStatusIndex.findOne({ where: { houseId } });
  const multiplier = parseFloat(hsi?.creditMultiplier ?? 1.0);
  return Math.round(BASE_FRONTING_ALLOWANCE * multiplier);
}

/**
 * Compute how much has been advanced, repaid, and what's remaining
 * @param {number} houseId
 * @returns {Promise<object>} { allowance, outstandingAdvanced, remaining, audit }
 */
async function getAdvanceUsage(houseId) {
  const allowance = await getAdvanceAllowance(houseId);
  
  // PRIMARY: Count currently outstanding advances (state-based)
  // Use a subquery approach to avoid GROUP BY issues
  const { sequelize } = require('../models');
  const [results] = await sequelize.query(`
    SELECT COALESCE(SUM(c.amount), 0) as outstanding
    FROM "Charges" c
    INNER JOIN "Bills" b ON c."billId" = b.id
    WHERE c.advanced = true 
      AND c.status = 'unpaid' 
      AND b."houseId" = :houseId
  `, {
    replacements: { houseId },
    type: sequelize.QueryTypes.SELECT
  });
  
  const outstandingAdvanced = parseFloat(results?.outstanding || 0);
  
  // SECONDARY: Transaction-based calculation for verification/auditing
  const totalAdvanced = parseFloat(await Transaction.sum('amount', { 
    where: { houseId, type: ['ADVANCE', 'CREDIT_USAGE'] } 
  })) || 0;
  
  const totalRepaid = parseFloat(await Transaction.sum('amount', { 
    where: { houseId, type: ['ADVANCE_REPAYMENT'] } 
  })) || 0;
  
  const transactionBased = totalAdvanced - totalRepaid;
  
  // Use state-based for the main calculation
  const remaining = Math.max(allowance - outstandingAdvanced, 0);
  
  return { 
    allowance, 
    outstandingAdvanced, 
    remaining,
    // Include transaction data for debugging/auditing
    audit: { totalAdvanced, totalRepaid, transactionBased }
  };
}

/**
 * Determine if a given amount can be advanced right now
 * @param {number} houseId
 * @param {number} amount  Amount you want to advance
 * @returns {Promise<object>} { allowed, allowance, outstandingAdvanced, remaining, totalAdvanced, totalRepaid, used }
 */
async function canAdvanceCharge(houseId, amount) {
  const { allowance, outstandingAdvanced, remaining, audit } = await getAdvanceUsage(houseId);
  return {
    allowed: amount <= remaining,
    allowance,
    outstandingAdvanced,
    remaining,
    // Include audit data for backwards compatibility and debugging
    totalAdvanced: audit.totalAdvanced,
    totalRepaid: audit.totalRepaid,
    used: audit.transactionBased
  };
}

/**
 * Advance payment for all unpaid charges in a bill
 * @param {number} billId
 * @param {object} transaction - Sequelize transaction
 * @returns {Promise<object>} { success, advancedAmount, chargesAdvanced }
 */
async function advanceUnpaidCharges(billId, transaction = null) {
  const t = transaction || await require('../models').sequelize.transaction();
  const shouldCommit = !transaction;

  try {
    // Get bill with all charges
    const bill = await Bill.findByPk(billId, {
      include: [{
        model: Charge,
        where: { status: 'unpaid' },
        required: false
      }],
      transaction: t
    });

    if (!bill) {
      throw new Error(`Bill ${billId} not found`);
    }

    const unpaidCharges = bill.Charges || [];
    
    if (unpaidCharges.length === 0) {
      return { success: true, advancedAmount: 0, chargesAdvanced: [] };
    }

    // Calculate total unpaid amount
    const totalUnpaid = unpaidCharges.reduce((sum, charge) => sum + parseFloat(charge.amount), 0);

    // Check if house can advance this amount
    const advanceCheck = await canAdvanceCharge(bill.houseId, totalUnpaid);
    if (!advanceCheck.allowed) {
      throw new Error(
        `Cannot advance $${totalUnpaid.toFixed(2)}. House allowance: $${advanceCheck.allowance.toFixed(2)}, ` +
        `remaining: $${advanceCheck.remaining.toFixed(2)}`
      );
    }

    const advancedCharges = [];
    const now = new Date();

    // Advance each unpaid charge
    for (const charge of unpaidCharges) {
      // Create ADVANCE transaction
      await Transaction.create({
        houseId: bill.houseId,
        chargeId: charge.id,
        type: 'ADVANCE',
        amount: charge.amount,
        description: `HouseTabz advanced payment for charge ${charge.id}`,
        balanceBefore: 0, // Will be properly calculated if needed
        balanceAfter: 0,  // Will be properly calculated if needed
        metadata: {
          originalDueDate: charge.dueDate,
          advanceDate: now.toISOString(),
          billId: bill.id
        }
      }, { transaction: t });

      // Mark charge as advanced using the new method
      await charge.markAsAdvanced(t);

      advancedCharges.push({
        id: charge.id,
        amount: charge.amount,
        userId: charge.userId
      });
    }

    if (shouldCommit) {
      await t.commit();
    }

    return {
      success: true,
      advancedAmount: totalUnpaid,
      chargesAdvanced: advancedCharges
    };

  } catch (error) {
    if (shouldCommit) {
      await t.rollback();
    }
    throw error;
  }
}

/**
 * Get all charges that are currently advanced for a house
 * @param {number} houseId
 * @returns {Promise<Array>} Array of advanced charges
 */
async function getAdvancedCharges(houseId) {
  return await Charge.findAll({
    where: { advanced: true, status: 'unpaid' }, // Only currently outstanding advances
    include: [{
      model: Bill,
      where: { houseId },
      attributes: ['id', 'name', 'houseId']
    }, {
      model: require('../models').User,
      as: 'User',
      attributes: ['id', 'username', 'email']
    }],
    order: [['advancedAt', 'ASC']]
  });
}

module.exports = {
  getAdvanceAllowance,
  getAdvanceUsage,
  canAdvanceCharge,
  advanceUnpaidCharges,
  getAdvancedCharges,
  
  // Keep legacy names for backwards compatibility during transition
  getFrontingAllowance: getAdvanceAllowance,
  getFrontingUsage: getAdvanceUsage,
  canFrontCharge: canAdvanceCharge
};