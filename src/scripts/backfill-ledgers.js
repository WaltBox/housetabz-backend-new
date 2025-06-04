// src/scripts/backfill-ledgers.js
const { sequelize, Bill, HouseServiceLedger, Charge, HouseService } = require('../models');

(async () => {
  const transaction = await sequelize.transaction();
  try {


    const bills = await Bill.findAll({
      include: [
        {
          model: Charge,
          as: 'Charges' // Match the actual alias used in your association
        },
        {
          model: HouseService,
          as: 'houseService'
        }
      ],
      transaction
    });

    for (const bill of bills) {
      if (!bill.houseService) {
        console.warn(`⚠️  Bill ${bill.id} has no associated HouseService. Skipping.`);
        continue;
      }

      const funded = bill.Charges
        .filter(c => c.status === 'paid')
        .reduce((sum, c) => sum + parseFloat(c.amount), 0);

      await HouseServiceLedger.create({
        houseServiceId: bill.houseService.id,
        billId: bill.id,
        fundingRequired: bill.baseAmount,
        funded,
        amountFronted: 0.00,
        status: 'closed',
        cycleStart: bill.createdAt,
        cycleEnd: bill.createdAt
      }, { transaction });
    }

    await transaction.commit();
  } catch (err) {
    await transaction.rollback();
    console.error('❌ Ledger backfill failed:', err);
  } finally {
    process.exit();
  }
})();
