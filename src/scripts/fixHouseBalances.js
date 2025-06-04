// scripts/fixHouseBalances.js
const { sequelize, HouseFinance, Transaction } = require('../models');

async function fixHouseBalances() {
  try {
  
    
    // Connect to database
    await sequelize.authenticate();

    
    // Show current wrong balances
    const currentBalances = await HouseFinance.findAll({
      where: { houseId: [4, 5] },
      order: [['houseId', 'ASC']]
    });
    
    currentBalances.forEach(hf => {
    
    });
    
    // Fix House 4: Should be 473.67

    const house4 = await HouseFinance.findOne({ where: { houseId: 4 } });
    if (house4) {
   
      const balanceBefore = parseFloat(house4.balance);
      const correctBalance = 473.67;
      const adjustmentAmount = correctBalance - balanceBefore; // This will be positive (adding back)
      
      house4.balance = correctBalance;
      house4.lastTransactionDate = new Date();
      await house4.save();
      
      // Create adjustment transaction record
      await Transaction.create({
        houseId: 4,
        type: 'ADJUSTMENT',
        amount: adjustmentAmount,
        description: 'Balance correction due to double-debiting bug fix',
        balanceBefore: balanceBefore,
        balanceAfter: correctBalance,
        status: 'COMPLETED',
        metadata: {
          reason: 'double_debit_correction',
          fixDate: new Date().toISOString(),
          notes: 'Correcting balance that was wrong due to duplicate payment processing'
        }
      });
      
  
    } else {
   
    }
    
    // Fix House 5: Should be 574.94

    const house5 = await HouseFinance.findOne({ where: { houseId: 5 } });
    if (house5) {
     
      const balanceBefore = parseFloat(house5.balance);
      const correctBalance = 574.94;
      const adjustmentAmount = correctBalance - balanceBefore; // This will be positive (adding back)
      
      house5.balance = correctBalance;
      house5.lastTransactionDate = new Date();
      await house5.save();
      
      // Create adjustment transaction record
      await Transaction.create({
        houseId: 5,
        type: 'ADJUSTMENT',
        amount: adjustmentAmount,
        description: 'Balance correction due to double-debiting bug fix',
        balanceBefore: balanceBefore,
        balanceAfter: correctBalance,
        status: 'COMPLETED',
        metadata: {
          reason: 'double_debit_correction',
          fixDate: new Date().toISOString(),
          notes: 'Correcting balance that was wrong due to duplicate payment processing'
        }
      });
      
   
    } else {

    }
    
    // Verify the fixes
    console.log('\n=== CORRECTED BALANCES ===');
    const correctedBalances = await HouseFinance.findAll({
      where: { houseId: [4, 5] },
      order: [['houseId', 'ASC']]
    });
    
    correctedBalances.forEach(hf => {
      console.log(`House ${hf.houseId}: Balance = ${hf.balance}, Ledger = ${hf.ledger}`);
    });
    
    // Show all house balances for reference
    console.log('\n=== ALL HOUSE BALANCES ===');
    const allBalances = await HouseFinance.findAll({
      order: [['houseId', 'ASC']]
    });
    
    allBalances.forEach(hf => {
      console.log(`House ${hf.houseId}: Balance = ${hf.balance}, Ledger = ${hf.ledger}`);
    });
    
    console.log('\n✅ House balance fix completed successfully!');
    console.log('\n=== ADJUSTMENT TRANSACTIONS CREATED ===');
    const adjustmentTransactions = await Transaction.findAll({
      where: { 
        type: 'ADJUSTMENT',
        houseId: [4, 5]
      },
      order: [['createdAt', 'DESC']],
      limit: 2
    });
    
    adjustmentTransactions.forEach(txn => {
      console.log(`House ${txn.houseId}: ${txn.description} - Amount: ${txn.amount}`);
    });
    
  } catch (error) {
    console.error('❌ Error fixing house balances:', error);
  } finally {
    await sequelize.close();
    console.log('Database connection closed');
    process.exit(0);
  }
}

// Run the fix
fixHouseBalances();