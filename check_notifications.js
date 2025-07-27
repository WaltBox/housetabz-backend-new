const { Notification, User } = require('./src/models');

async function checkNotifications() {
  try {
    const notifications = await Notification.findAll({
      where: { metadata: { type: 'charge_advanced' } },
      include: [{ model: User, attributes: ['username'] }],
      order: [['createdAt', 'DESC']],
      limit: 4
    });

    console.log('🔔 Recent advance notifications:');
    notifications.forEach((n, i) => {
      console.log(`${i + 1}. ${n.User.username}: "${n.message}"`);
      console.log(`   Created: ${n.createdAt}`);
      console.log('');
    });

    console.log(`Total advance notifications: ${notifications.length}`);
  } catch (error) {
    console.error('Error:', error);
  }
  
  process.exit(0);
}

checkNotifications(); 