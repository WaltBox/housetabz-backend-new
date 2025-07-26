'use strict';

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // Get all ledgers that have associated bills
    const ledgersWithBills = await queryInterface.sequelize.query(
      `SELECT 
        hsl.id as ledger_id,
        hsl."fundingRequired",
        hsl."serviceFeeTotal",
        hsl."totalRequired",
        b.id as bill_id,
        b."serviceFeeTotal" as bill_service_fee_total,
        b.amount as bill_total_amount
      FROM "HouseServiceLedgers" hsl
      INNER JOIN "Bills" b ON hsl."billId" = b.id
      WHERE hsl."serviceFeeTotal" = 0 OR hsl."totalRequired" = 0`,
      { type: Sequelize.QueryTypes.SELECT }
    );

    console.log(`Found ${ledgersWithBills.length} ledgers to backfill with service fee data`);

    // Update each ledger with the service fee from its associated bill
    for (const ledger of ledgersWithBills) {
      const serviceFeeTotal = parseFloat(ledger.bill_service_fee_total) || 0;
      const fundingRequired = parseFloat(ledger.fundingRequired) || 0;
      const totalRequired = fundingRequired + serviceFeeTotal;

      await queryInterface.sequelize.query(
        `UPDATE "HouseServiceLedgers" 
         SET 
           "serviceFeeTotal" = :serviceFeeTotal,
           "totalRequired" = :totalRequired,
           "updatedAt" = NOW()
         WHERE id = :ledgerId`,
        {
          replacements: {
            serviceFeeTotal: serviceFeeTotal,
            totalRequired: totalRequired,
            ledgerId: ledger.ledger_id
          },
          type: Sequelize.QueryTypes.UPDATE
        }
      );

      console.log(`Updated ledger ${ledger.ledger_id}: serviceFee=${serviceFeeTotal}, totalRequired=${totalRequired}`);
    }

    console.log(`Successfully backfilled ${ledgersWithBills.length} ledgers with service fee data`);
  },

  async down(queryInterface, Sequelize) {
    // Reset the service fee fields back to 0
    await queryInterface.sequelize.query(
      `UPDATE "HouseServiceLedgers" 
       SET 
         "serviceFeeTotal" = 0,
         "totalRequired" = "fundingRequired",
         "updatedAt" = NOW()`,
      { type: Sequelize.QueryTypes.UPDATE }
    );

    console.log('Reset all service fee fields to 0');
  }
}; 