const { 
  Charge, 
  User, 
  House, 
  Bill, 
  Notification,
  sequelize 
} = require('./src/models');
const { Op } = require('sequelize');

async function sendAdvanceResetNotifications() {
  try {
    console.log('🔄 Starting advance reset notifications for existing users...');
    
    // Find all bills that have advanced charges
    const billsWithAdvances = await Bill.findAll({
      include: [
        {
          model: Charge,
          where: { 
            advanced: true,
            status: 'unpaid' // Only unpaid advanced charges
          },
          required: true,
          include: [
            {
              model: User,
              as: 'User',
              attributes: ['id', 'username', 'email']
            }
          ]
        },
        {
          model: House,
          attributes: ['id', 'name']
        }
      ]
    });
    
    console.log(`📊 Found ${billsWithAdvances.length} bills with advanced charges`);
    
    let totalNotificationsSent = 0;
    
    // Process each bill
    for (const bill of billsWithAdvances) {
      try {
        console.log(`\\n📄 Processing bill: ${bill.name} (House: ${bill.House.name})`);
        
        // Group charges by user for this bill
        const userCharges = {};
        
        for (const charge of bill.Charges) {
          if (charge.advanced && charge.status === 'unpaid') {
            if (!userCharges[charge.userId]) {
              userCharges[charge.userId] = {
                user: charge.User,
                charges: [],
                totalAdvanced: 0
              };
            }
            userCharges[charge.userId].charges.push(charge);
            userCharges[charge.userId].totalAdvanced += parseFloat(charge.amount);
          }
        }
        
        console.log(`👥 Users with advanced charges on this bill: ${Object.keys(userCharges).length}`);
        
        // Get remaining advance allowance for this house
        const advanceService = require('./src/services/advanceService');
        const advanceCheck = await advanceService.canAdvanceCharge(bill.House.id, 0);
        const remainingAdvance = advanceCheck.remaining || 0;
        
        // Calculate total advanced amount for this bill
        const totalAdvancedForBill = Object.values(userCharges).reduce((sum, userInfo) => sum + userInfo.totalAdvanced, 0);
        const totalChargesAdvanced = Object.values(userCharges).reduce((sum, userInfo) => sum + userInfo.charges.length, 0);
        
        // Get ALL users in the house (not just users with advanced charges)
        const allHouseUsers = await User.findAll({
          where: { houseId: bill.House.id },
          attributes: ['id', 'username', 'email']
        });
        
        console.log(`🏠 Sending notifications to all ${allHouseUsers.length} users in ${bill.House.name} house`);
        
        // Send notification to ALL users in the house
        for (const user of allHouseUsers) {
          try {
            // Check if user already has a notification for this specific bill
            const existingNotification = await Notification.findOne({
              where: {
                userId: user.id,
                metadata: { 
                  type: { [Op.in]: ['charge_advanced', 'advance_reset'] },
                  billId: bill.id
                }
              }
            });
            
            if (existingNotification) {
              console.log(`⏭️  Skipped ${user.username} (already has notification for bill ${bill.id})`);
              continue;
            }
            
            // Format the notification message
            const chargeText = totalChargesAdvanced === 1 ? '1 charge' : `${totalChargesAdvanced} charges`;
            
            const message = `HouseTabz had to advance ${chargeText} ($${totalAdvancedForBill.toFixed(2)}) for ${bill.name}. Your house only $${remainingAdvance.toFixed(2)} allowance remaining. Remind everyone to pay to reset this so bills don't go unpaid.`;
            
            // Create database notification
            await Notification.create({
              userId: user.id,
              message: message,
              isRead: false,
              metadata: {
                type: 'advance_reset',
                billId: bill.id,
                houseId: bill.House.id,
                totalAdvanced: totalAdvancedForBill,
                remainingAdvance: remainingAdvance,
                chargeCount: totalChargesAdvanced,
                isResetNotification: true
              }
            });
            
            // Send push notification
            const pushNotificationService = require('./src/services/pushNotificationService');
            await pushNotificationService.sendPushNotification(user, {
              title: 'HouseTabz Advanced Payment',
              message: message,
              data: {
                type: 'advance_reset',
                billId: bill.id,
                houseId: bill.House.id,
                totalAdvanced: totalAdvancedForBill,
                remainingAdvance: remainingAdvance
              }
            });
            
            console.log(`✅ Sent notification to ${user.username} for bill ${bill.name} ($${totalAdvancedForBill.toFixed(2)})`);
            totalNotificationsSent++;
            
            // Add small delay to prevent spam
            await new Promise(resolve => setTimeout(resolve, 500));
            
          } catch (error) {
            console.error(`❌ Error sending notification to ${user.username}:`, error.message);
          }
        }
        
      } catch (error) {
        console.error(`❌ Error processing bill ${bill.name}:`, error.message);
      }
    }
    
    console.log(`\\n🎉 Advance reset notifications complete!`);
    console.log(`📬 Total notifications sent: ${totalNotificationsSent}`);
    console.log(`📄 Bills processed: ${billsWithAdvances.length}`);
    
  } catch (error) {
    console.error('❌ Error in advance reset notifications:', error);
  }
  
  process.exit(0);
}

sendAdvanceResetNotifications(); 