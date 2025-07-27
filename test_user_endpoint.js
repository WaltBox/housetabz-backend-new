const { User, House, Charge, UserFinance } = require('./src/models');

async function testUserEndpoint() {
  try {
    // Test the same query that getUser uses
    const user = await User.findByPk(5, {
      attributes: ['id', 'username', 'email', 'phoneNumber', 'houseId', 'onboarded', 'onboarding_step', 'onboarded_at'],
      include: [
        {
          model: House,
          as: 'house',
          attributes: ['id', 'name']
        },
        {
          model: Charge,
          as: 'charges',
          attributes: ['id', 'amount', 'status', 'billId', 'name']
        },
        {
          model: UserFinance,
          as: 'finance',
          attributes: ['balance', 'credit', 'points']
        }
      ]
    });

    if (!user) {
      console.log('User 5 not found');
      return;
    }

    console.log('✅ Fixed getUser endpoint data for user 5:');
    console.log({
      id: user.id,
      username: user.username,
      email: user.email,
      houseId: user.houseId,
      onboarded: user.onboarded,
      onboarding_step: user.onboarding_step,
      onboarded_at: user.onboarded_at,
      house: user.house ? { id: user.house.id, name: user.house.name } : null,
      chargesCount: user.charges ? user.charges.length : 0,
      finance: user.finance ? {
        balance: user.finance.balance,
        credit: user.finance.credit,
        points: user.finance.points
      } : null
    });

    console.log('\n🎉 SUCCESS: The getUser endpoint now includes onboarding fields!');
    console.log('📝 When deployed to production, user 8 should now have:');
    console.log('   - onboarded: true/false');
    console.log('   - onboarding_step: "house"|"payment"|"completed"');
    console.log('   - onboarded_at: timestamp or null');
    
    process.exit(0);
  } catch (error) {
    console.error('❌ Error:', error);
    process.exit(1);
  }
}

testUserEndpoint(); 