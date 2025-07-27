// src/scripts/debug-advance-allowance.js - Debug Advance Allowance Calculation
const { sequelize } = require('../models');
const { Op } = require('sequelize');
const House = sequelize.models.House;
const User = sequelize.models.User;
const HouseStatusIndex = sequelize.models.HouseStatusIndex;
const Charge = sequelize.models.Charge;
const Bill = sequelize.models.Bill;
const { getAdvanceAllowance, getAdvanceUsage, canAdvanceCharge } = require('../services/advanceService');
const { BASE_FRONTING_ALLOWANCE } = require('../config/riskSettings');

async function debugAdvanceAllowance() {
  console.log('🔍 Debugging Advance Allowance Calculation');
  console.log('==========================================');
  
  try {
    // Check base configuration
    console.log(`\n📋 Base Configuration:`);
    console.log(`   - BASE_FRONTING_ALLOWANCE: $${BASE_FRONTING_ALLOWANCE}`);
    
    // Check house 5 (the test house)
    const houseId = 5;
    console.log(`\n🏠 Checking House ${houseId}:`);
    
    // Get HSI data
    const hsi = await HouseStatusIndex.findOne({ where: { houseId } });
    if (hsi) {
      console.log(`   - HSI Score: ${hsi.score}`);
      console.log(`   - HSI Bracket: ${hsi.bracket}`);
      console.log(`   - Credit Multiplier: ${hsi.creditMultiplier}`);
      console.log(`   - Fee Multiplier: ${hsi.feeMultiplier}`);
      console.log(`   - Unpaid Amount: $${hsi.unpaidAmount}`);
    } else {
      console.log(`   - No HSI found for house ${houseId}`);
    }
    
    // Calculate advance allowance
    const allowance = await getAdvanceAllowance(houseId);
    console.log(`   - Calculated Allowance: $${allowance}`);
    console.log(`   - Calculation: $${BASE_FRONTING_ALLOWANCE} × ${hsi?.creditMultiplier || 1.0} = $${allowance}`);
    
    // Get advance usage
    const usage = await getAdvanceUsage(houseId);
    console.log(`\n💰 Advance Usage:`);
    console.log(`   - Total Allowance: $${usage.allowance}`);
    console.log(`   - Currently Outstanding: $${usage.outstandingAdvanced}`);
    console.log(`   - Remaining Available: $${usage.remaining}`);
    console.log(`   - Audit (Transaction-based): $${usage.audit.transactionBased}`);
    
    // Check pending bills with unpaid charges
    console.log(`\n📄 Pending Bills Analysis:`);
    const pendingBills = await Bill.findAll({
      where: { 
        houseId,
        status: { [Op.in]: ['pending', 'partial_paid'] }
      },
      include: [
        {
          model: Charge,
          where: { status: 'unpaid' },
          required: false,
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['id', 'username']
            }
          ]
        }
      ]
    });
    
    for (const bill of pendingBills) {
      const unpaidCharges = bill.Charges || [];
      const unpaidAmount = unpaidCharges.reduce((sum, charge) => sum + parseFloat(charge.amount), 0);
      
      console.log(`\n   📝 Bill: ${bill.name}`);
      console.log(`      - Due Date: ${bill.dueDate}`);
      console.log(`      - Status: ${bill.status}`);
      console.log(`      - Total Amount: $${bill.amount}`);
      console.log(`      - Unpaid Amount: $${unpaidAmount}`);
      console.log(`      - Unpaid Charges: ${unpaidCharges.length}`);
      
      if (unpaidCharges.length > 0) {
        console.log(`      - Unpaid Users:`);
        unpaidCharges.forEach(charge => {
          console.log(`        * ${charge.User.username}: $${charge.amount}`);
        });
        
        // Test advance capability
        const advanceCheck = await canAdvanceCharge(houseId, unpaidAmount);
        console.log(`      - Can Advance: ${advanceCheck.allowed}`);
        console.log(`      - Allowance: $${advanceCheck.allowance}`);
        console.log(`      - Outstanding: $${advanceCheck.outstandingAdvanced}`);
        console.log(`      - Remaining: $${advanceCheck.remaining}`);
        
        if (!advanceCheck.allowed) {
          const shortfall = unpaidAmount - advanceCheck.remaining;
          console.log(`      - ❌ SHORTFALL: $${shortfall.toFixed(2)}`);
          console.log(`      - 💡 This explains the advance insufficient alert!`);
        } else {
          console.log(`      - ✅ Can advance $${unpaidAmount} (remaining: $${advanceCheck.remaining})`);
        }
      }
    }
    
    console.log(`\n✅ Debug analysis complete!`);
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
  } finally {
    await sequelize.close();
  }
}

// Run if this file is executed directly
if (require.main === module) {
  debugAdvanceAllowance()
    .then(() => {
      console.log('\n🏁 Debug completed');
      process.exit(0);
    })
    .catch(error => {
      console.error('\n💥 Debug failed:', error);
      process.exit(1);
    });
}

module.exports = { debugAdvanceAllowance }; 