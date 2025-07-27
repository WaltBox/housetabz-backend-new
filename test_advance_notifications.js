const { Charge, User, House, Bill, Notification } = require('./src/models');

async function testAdvanceNotifications() {
  try {
    console.log('🧪 Testing advance notification system...');
    
    // Find a charge that can be advanced (unpaid and not already advanced)
    const charge = await Charge.findOne({
      where: { 
        status: 'unpaid',
        advanced: false 
      },
      include: [
        {
          model: Bill,
          include: [
            {
              model: House,
              include: [
                {
                  model: User,
                  as: 'users',
                  attributes: ['id', 'username', 'email']
                }
              ]
            }
          ]
        }
      ]
    });
    
    if (!charge) {
      console.log('❌ No suitable charge found for testing');
      return;
    }
    
    console.log(`✅ Found charge ${charge.id} for $${charge.amount} (${charge.name})`);
    console.log(`📍 House: ${charge.Bill.House.name} with ${charge.Bill.House.users.length} users`);
    
    // Count current notifications before advance
    const notificationsBefore = await Notification.count({
      where: { 
        metadata: { type: 'charge_advanced' }
      }
    });
    
    console.log(`📊 Current advance notifications in DB: ${notificationsBefore}`);
    
    // Mark charge as advanced
    console.log(`🚀 Marking charge ${charge.id} as advanced...`);
    await charge.markAsAdvanced();
    
    // Wait a moment for notifications to be sent
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Count notifications after advance
    const notificationsAfter = await Notification.count({
      where: { 
        metadata: { type: 'charge_advanced' }
      }
    });
    
    console.log(`📊 Advance notifications after test: ${notificationsAfter}`);
    console.log(`📈 New notifications created: ${notificationsAfter - notificationsBefore}`);
    
    // Check the actual notifications created
    const newNotifications = await Notification.findAll({
      where: { 
        metadata: { type: 'charge_advanced', chargeId: charge.id }
      },
      include: [
        {
          model: User,
          attributes: ['id', 'username']
        }
      ]
    });
    
    console.log(`\\n📬 Notifications sent:`);
    newNotifications.forEach(notif => {
      console.log(`  - ${notif.user.username}: "${notif.message}"`);
    });
    
    // Verify charge is marked as advanced
    await charge.reload();
    console.log(`\\n✅ Charge ${charge.id} advanced status: ${charge.advanced}`);
    console.log(`✅ Charge ${charge.id} advancedAt: ${charge.advancedAt}`);
    
    console.log('\\n🎉 Test completed successfully!');
    
  } catch (error) {
    console.error('❌ Test failed:', error);
  }
  
  process.exit(0);
}

testAdvanceNotifications(); 