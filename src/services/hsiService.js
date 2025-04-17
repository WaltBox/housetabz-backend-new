const { User, UserFinance, HouseStatusIndex, Notification, sequelize } = require('../models');
const pushNotificationService = require('./pushNotificationService');

const SMOOTHING_ALPHA = 0.2;  // tune this between 0.1 and 0.3 for your desired reactivity
const WARNING_THRESHOLD = 2;  // notify if within 2 points of dropping to the next lower bracket

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
      const measured = Math.min(Math.max(Math.round(avgPoints + 50), 0), 100);

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
      const newBracket = Math.floor(newHsi / 10);
      const feeMultiplier  = this.calculateFeeMultiplier(newHsi);
      const creditMultiplier = this.calculateCreditMultiplier(newHsi);

      // 5) Upsert HSI record
      const [hsi, created] = await HouseStatusIndex.findOrCreate({
        where: { houseId },
        defaults: {
          score: newHsi,
          bracket: newBracket,
          feeMultiplier,
          creditMultiplier,
          updatedReason: 'Initial calculation'
        },
        transaction
      });
      if (!created) {
        await hsi.update({
          score: newHsi,
          bracket: newBracket,
          feeMultiplier,
          creditMultiplier,
          updatedReason: 'EMA update'
        }, { transaction });
      }

      // 6) Determine if a warning notification should be sent.
      //    Calculate the previous bracket from previousHsi.
      const previousBracket = Math.floor(previousHsi / 10);
      const lowerBoundary = newBracket * 10;
      
      // If the new bracket is lower than the previous or the newHsi is within the warning threshold of dropping
      if (newBracket < previousBracket || (newHsi - lowerBoundary) <= WARNING_THRESHOLD) {
        await notifyHouseUsers(houseId, newHsi, newBracket);
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

/**
 * Helper function to notify all users in a house that the HSI is low or about to drop brackets.
 *
 * @param {number} houseId - The house identifier.
 * @param {number} newHsi - The newly calculated HSI.
 * @param {number} newBracket - The new bracket for the HSI.
 */
async function notifyHouseUsers(houseId, newHsi, newBracket) {
  try {
    // Retrieve all users in the house
    const users = await User.findAll({ where: { houseId } });
    // Calculate the lower bound of the current bracket
    const lowerBoundary = newBracket * 10;
    // Customize your notification message below as needed
    const warningMessage = `House HSI is ${newHsi}, which is close to falling below the safe bracket (${lowerBoundary}). Please take action to improve your house status.`;

    for (const user of users) {
      try {
        // Create an in-app notification
        const notification = await Notification.create({
          userId: user.id,
          message: warningMessage,
          isRead: false,
          metadata: {
            type: 'hsi_bracket_warning',
            houseId,
            newHsi
          }
        });
        // Send a push notification to the user
        await pushNotificationService.sendPushNotification(user, {
          title: 'House HSI Warning',
          message: warningMessage,
          data: {
            notificationId: notification.id,
            newHsi
          }
        });
      } catch (error) {
        console.error(`Error notifying user ${user.id} about HSI drop:`, error);
      }
    }
  } catch (error) {
    console.error('Error in notifyHouseUsers:', error);
  }
}

module.exports = hsiService;
