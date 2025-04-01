// scripts/manualHSIUpdate.js
const { sequelize, HouseStatusIndex } = require('../models');
const hsiService = require('../services/hsiService');

async function run() {
  try {
    // Retrieve houseId and newScore from command-line arguments (or use defaults)
    const houseId = process.argv[2] || 1; // Default houseId if not provided
    const newScore = process.argv[3] ? parseInt(process.argv[3], 10) : 30; // Default score of 30

    // Calculate derived values from the new score
    const newBracket = Math.floor(newScore / 10);
    const feeMultiplier = 1 + ((50 - newScore) / 250);
    const creditMultiplier = newScore / 50;

    console.log(`Updating HSI for houseId: ${houseId}`);
    console.log(`New score: ${newScore}, bracket: ${newBracket}, fee multiplier: ${feeMultiplier.toFixed(2)}, credit multiplier: ${creditMultiplier.toFixed(2)}`);

    // Find existing HSI record for the house, or create one if none exists
    let hsi = await HouseStatusIndex.findOne({ where: { houseId } });
    if (!hsi) {
      hsi = await HouseStatusIndex.create({
        houseId,
        score: newScore,
        bracket: newBracket,
        feeMultiplier,
        creditMultiplier,
        updatedReason: 'Manual update'
      });
      console.log("Created a new HouseStatusIndex record.");
    } else {
      await hsi.update({
        score: newScore,
        bracket: newBracket,
        feeMultiplier,
        creditMultiplier,
        updatedReason: 'Manual update'
      });
      console.log("Updated the existing HouseStatusIndex record.");
    }

    // Define the fee category for this example
    const feeCategory = "card"; // For 'card', the base fee is $2.00; for 'marketplace', it's $0.00

    // Calculate the adjusted service fee using the hsiService
    const serviceFee = await hsiService.getServiceFee(houseId, feeCategory);
    console.log(`For feeCategory "${feeCategory}":`);
    console.log(`- Base fee: $${feeCategory === "card" ? '2.00' : '0.00'}`);
    console.log(`- Adjusted service fee (after applying HSI multiplier): $${serviceFee}`);

    // Exit gracefully
    process.exit(0);
  } catch (error) {
    console.error("Error updating HSI and calculating service fee:", error);
    process.exit(1);
  }
}

run();
