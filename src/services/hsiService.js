// src/services/hsiService.js
const { User, UserFinance, HouseStatusIndex, sequelize } = require('../models');

const SMOOTHING_ALPHA = 0.2;  // tune this between 0.1 and 0.3 for your desired reactivity

const hsiService = {
  async updateHouseHSI(houseId, externalTransaction) {
    const transaction = externalTransaction || await sequelize.transaction();
    try {
      // 1) Compute measured HSI from current points
      const users = await User.findAll({
        where: { houseId },
        include: [{ model: UserFinance, as: 'finance', attributes: ['points'] }],
        transaction
      });
      if (!users.length) {
        if (!externalTransaction) await transaction.commit();
        return null;
      }

      const totalPoints = users.reduce((sum, u) => {
        const p = u.finance?.points ?? 0;
        return sum + p;
      }, 0);
      const avgPoints = totalPoints / users.length;
      const measured  = Math.min(Math.max(Math.round(avgPoints + 50), 0), 100);

      // 2) Load previous HSI (or default to measured if none)
      let previousHsi = measured;
      const existing = await HouseStatusIndex.findOne({
        where: { houseId },
        order: [['updatedAt', 'DESC']],
        transaction
      });
      if (existing) previousHsi = existing.score;

      // 3) EMA blend
      let newHsi = Math.round(
        SMOOTHING_ALPHA * measured +
        (1 - SMOOTHING_ALPHA) * previousHsi
      );
      newHsi = Math.min(Math.max(newHsi, 0), 100);

      // 4) Derive other attributes
      const bracket        = Math.floor(newHsi / 10);
      const feeMultiplier  = this.calculateFeeMultiplier(newHsi);
      const creditMultiplier = this.calculateCreditMultiplier(newHsi);

      // 5) Upsert HSI record
      const [hsi, created] = await HouseStatusIndex.findOrCreate({
        where: { houseId },
        defaults: {
          score: newHsi,
          bracket,
          feeMultiplier,
          creditMultiplier,
          updatedReason: 'Initial calculation'
        },
        transaction
      });
      if (!created) {
        await hsi.update({
          score: newHsi,
          bracket,
          feeMultiplier,
          creditMultiplier,
          updatedReason: 'EMA update'
        }, { transaction });
      }

      if (!externalTransaction) await transaction.commit();
      return hsi;
    } catch (err) {
      if (!externalTransaction) await transaction.rollback();
      throw err;
    }
  },

  calculateFeeMultiplier(hsiScore) {
    return 1 + ((50 - hsiScore) / 250);
  },

  calculateCreditMultiplier(hsiScore) {
    return hsiScore / 50;
  }
};

module.exports = hsiService;
