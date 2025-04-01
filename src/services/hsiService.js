// src/services/hsiService.js
const { User, HouseStatusIndex, sequelize } = require('../models');

const hsiService = {
  async updateHouseHSI(houseId, externalTransaction) {
    // Use the provided transaction or create a new one if none was passed
    const transaction = externalTransaction || await sequelize.transaction();

    try {
      // Retrieve all users for the given house
      const users = await User.findAll({ 
        where: { houseId },
        transaction
      });
      
      if (!users.length) return null;

      // Calculate average user points and derive the new HSI score
      const totalPoints = users.reduce((sum, user) => sum + user.points, 0);
      const avgPoints = totalPoints / users.length;
      const newHsiScore = Math.min(Math.max(Math.round(avgPoints + 50), 0), 100);

      // Derive additional HSI attributes
      const newBracket = Math.floor(newHsiScore / 10);
      const feeMultiplier = this.calculateFeeMultiplier(newHsiScore);
      const creditMultiplier = this.calculateCreditMultiplier(newHsiScore);

      // Find an existing HSI record or create a new one if it doesn't exist
      const [hsi, created] = await HouseStatusIndex.findOrCreate({
        where: { houseId },
        defaults: {
          score: newHsiScore,
          bracket: newBracket,
          feeMultiplier,
          creditMultiplier,
          updatedReason: 'Initial calculation'
        },
        transaction
      });
      
      // If the record already exists, update it
      if (!created) {
        await hsi.update({
          score: newHsiScore,
          bracket: newBracket,
          feeMultiplier,
          creditMultiplier,
          updatedReason: 'Regular update'
        }, { transaction });
      }
      
      // Commit the transaction only if we created it here
      if (!externalTransaction) await transaction.commit();
      
      return hsi;
    } catch (error) {
      if (!externalTransaction) await transaction.rollback();
      throw error;
    }
  },
  
  calculateFeeMultiplier(hsiScore) {
    // Example:
    // HSI 100 = 0.8x (20% discount)
    // HSI 50  = 1.0x (standard)
    // HSI 0   = 1.2x (20% surcharge)
    return 1 + ((50 - hsiScore) / 250);
  },
  
  calculateCreditMultiplier(hsiScore) {
    // Example:
    // HSI 100 = 2.0x (double credit)
    // HSI 50  = 1.0x (standard credit)
    // HSI 0   = 0.0x (no credit)
    return hsiScore / 50;
  },
  
  async getServiceFee(houseId, feeCategory) {
    // Determine the base fee based on the fee category from HouseService
    const baseFee = feeCategory === 'card' ? 2.00 : 0.00;
    
    // Retrieve the most recent HSI for the house
    const hsi = await HouseStatusIndex.findOne({
      where: { houseId },
      order: [['updatedAt', 'DESC']]
    });
    
    // If no HSI record is found, default to the base fee
    if (!hsi) return baseFee;
    
    // Calculate and return the adjusted fee using the HSI fee multiplier
    return parseFloat((baseFee * hsi.feeMultiplier).toFixed(2));
  }
};

module.exports = hsiService;
