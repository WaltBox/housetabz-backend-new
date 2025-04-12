const { sequelize, PaymentMethod } = require('../models'); // adjust if needed

(async () => {
  try {
    await sequelize.authenticate();
    const userId = 5; // replace with test user

    const newMethod = await PaymentMethod.create({
      userId,
      stripePaymentMethodId: `pm_housetabz_${Date.now()}`,
      type: 'housetabz',
      last4: '0000',
      brand: 'HouseTabz',
      isDefault: false,
    });

    console.log('Created fake HouseTabz payment method:', newMethod.toJSON());
    process.exit(0);
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
})();
