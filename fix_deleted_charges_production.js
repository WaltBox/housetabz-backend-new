const { 
  User, 
  House, 
  UserFinance, 
  HouseFinance, 
  Transaction, 
  BillSubmission,
  sequelize 
} = require('./src/models');

// Configuration - modify these if needed
const CONFIG = {
  houseName: 'Caswell B',
  usernames: ['walt', 'max Gilman', 'lukepyle41', 'Connor Cordell'],
  chargeAmount: 156.04, // Amount per user including fees
  totalAmount: 624.16, // Total bill amount
  billSubmissionId: 15,
  serviceName: 'City Of Austin',
  billDate: '2025-07-12'
};

async function fixDeletedCharges() {
  console.log('🔧 Starting fix for manually deleted charges...');
  console.log('⚠️  THIS IS A PRODUCTION SCRIPT - USE WITH CAUTION!');
  console.log('📋 Configuration:');
  console.log(`  - House: ${CONFIG.houseName}`);
  console.log(`  - Users: ${CONFIG.usernames.join(', ')}`);
  console.log(`  - Amount per user: $${CONFIG.chargeAmount}`);
  console.log(`  - Total amount: $${CONFIG.totalAmount}`);
  console.log(`  - Bill submission ID: ${CONFIG.billSubmissionId}`);
  console.log('');
  
  const transaction = await sequelize.transaction();
  
  try {
    // Find the house
    const house = await House.findOne({
      where: { name: CONFIG.houseName },
      transaction
    });
    
    if (!house) {
      // List available houses for debugging
      const houses = await House.findAll({ 
        attributes: ['id', 'name'],
        transaction 
      });
      console.log('Available houses:');
      houses.forEach(h => console.log(`  - "${h.name}" (ID: ${h.id})`));
      throw new Error(`House "${CONFIG.houseName}" not found`);
    }
    
    console.log(`✅ Found house: ${house.name} (ID: ${house.id})`);
    
    // Find the users by username
    const users = await User.findAll({
      where: { 
        username: CONFIG.usernames,
        houseId: house.id 
      },
      include: [{
        model: UserFinance,
        as: 'finance',
        required: false
      }],
      transaction
    });
    
    console.log(`📊 Found ${users.length} users:`);
    users.forEach(user => {
      const balance = user.finance ? parseFloat(user.finance.balance) : 0;
      console.log(`  - ${user.username} (ID: ${user.id}) - Current balance: $${balance.toFixed(2)}`);
    });
    
    if (users.length !== CONFIG.usernames.length) {
      const foundUsernames = users.map(u => u.username);
      const missingUsers = CONFIG.usernames.filter(u => !foundUsernames.includes(u));
      console.warn(`⚠️ Missing users: ${missingUsers.join(', ')}`);
    }
    
    // Get house finance
    let houseFinance = await HouseFinance.findOne({
      where: { houseId: house.id },
      transaction
    });
    
    if (!houseFinance) {
      // Create house finance if it doesn't exist
      houseFinance = await HouseFinance.create({
        houseId: house.id,
        balance: 0,
        ledger: 0
      }, { transaction });
      console.log('✅ Created house finance record');
    }
    
    const houseBalanceBefore = parseFloat(houseFinance.balance);
    console.log(`🏠 House balance before: $${houseBalanceBefore.toFixed(2)}`);
    
    console.log(`\n💰 Processing balance adjustments...`);
    
    // Fix each user's balance
    const userTransactions = [];
    for (const user of users) {
      let userFinance = user.finance;
      
      if (!userFinance) {
        // Create user finance if it doesn't exist
        userFinance = await UserFinance.create({
          userId: user.id,
          balance: 0,
          credit: 0,
          points: 0
        }, { transaction });
        console.log(`✅ Created finance record for ${user.username}`);
      }
      
      const balanceBefore = parseFloat(userFinance.balance);
      const balanceAfter = balanceBefore - CONFIG.chargeAmount;
      
      // Update user balance
      await userFinance.update({
        balance: balanceAfter.toFixed(2),
        lastTransactionDate: new Date()
      }, { transaction });
      
      // Create transaction record
      const userTransaction = await Transaction.create({
        userId: user.id,
        houseId: house.id,
        type: 'ADJUSTMENT',
        amount: CONFIG.chargeAmount.toFixed(2),
        description: `Manual charge deletion reversal - ${CONFIG.serviceName} bill (${CONFIG.billDate})`,
        balanceBefore: balanceBefore.toFixed(2),
        balanceAfter: balanceAfter.toFixed(2),
        status: 'COMPLETED',
        metadata: {
          reason: 'manual_charge_deletion',
          originalAmount: CONFIG.chargeAmount,
          deletedBy: 'admin',
          serviceName: CONFIG.serviceName,
          billDate: CONFIG.billDate
        }
      }, { transaction });
      
      userTransactions.push(userTransaction);
      console.log(`✅ ${user.username}: $${balanceBefore.toFixed(2)} → $${balanceAfter.toFixed(2)} (-$${CONFIG.chargeAmount})`);
    }
    
    // Fix house balance
    const houseBalanceAfter = houseBalanceBefore - CONFIG.totalAmount;
    
    await houseFinance.update({
      balance: houseBalanceAfter.toFixed(2),
      lastTransactionDate: new Date()
    }, { transaction });
    
    // Create house transaction record
    const houseTransaction = await Transaction.create({
      houseId: house.id,
      type: 'ADJUSTMENT',
      amount: CONFIG.totalAmount.toFixed(2),
      description: `House balance adjustment - deleted ${CONFIG.serviceName} bill ($${CONFIG.totalAmount})`,
      balanceBefore: houseBalanceBefore.toFixed(2),
      balanceAfter: houseBalanceAfter.toFixed(2),
      status: 'COMPLETED',
      metadata: {
        reason: 'manual_bill_deletion',
        originalBillAmount: CONFIG.totalAmount,
        deletedBy: 'admin',
        serviceName: CONFIG.serviceName,
        billDate: CONFIG.billDate,
        affectedUsers: CONFIG.usernames,
        userTransactionIds: userTransactions.map(t => t.id)
      }
    }, { transaction });
    
    console.log(`🏠 House balance: $${houseBalanceBefore.toFixed(2)} → $${houseBalanceAfter.toFixed(2)} (-$${CONFIG.totalAmount})`);
    
    // Reset bill submission to pending
    const billSubmission = await BillSubmission.findByPk(CONFIG.billSubmissionId, { transaction });
    
    if (billSubmission) {
      const oldStatus = billSubmission.status;
      const oldAmount = billSubmission.amount;
      
      await billSubmission.update({
        status: 'pending',
        amount: null
      }, { transaction });
      
      console.log(`✅ Bill submission ${CONFIG.billSubmissionId}: ${oldStatus} → pending, amount: $${oldAmount} → null`);
    } else {
      console.warn(`⚠️ Bill submission ${CONFIG.billSubmissionId} not found`);
    }
    
    console.log('\n🎉 Fix completed successfully!');
    console.log('\n📊 Summary:');
    console.log(`  - Updated ${users.length} user balances (-$${CONFIG.chargeAmount} each)`);
    console.log(`  - Updated house balance (-$${CONFIG.totalAmount})`);
    console.log(`  - Created ${users.length + 1} transaction records`);
    console.log(`  - Reset bill submission ${CONFIG.billSubmissionId} to pending`);
    console.log(`  - House transaction ID: ${houseTransaction.id}`);
    console.log(`  - User transaction IDs: ${userTransactions.map(t => t.id).join(', ')}`);
    
    await transaction.commit();
    
  } catch (error) {
    await transaction.rollback();
    console.error('❌ Error fixing deleted charges:', error);
    throw error;
  }
}

// Run the fix
if (require.main === module) {
  fixDeletedCharges()
    .then(() => {
      console.log('\n✅ All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n❌ Script failed:', error.message);
      process.exit(1);
    });
}

module.exports = fixDeletedCharges; 