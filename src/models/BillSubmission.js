// src/models/BillSubmission.js
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BillSubmission extends Model {
    static associate(models) {
      BillSubmission.belongsTo(models.HouseService, {
        foreignKey: 'houseServiceId',
        as: 'houseService'
      });
      BillSubmission.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      BillSubmission.belongsTo(models.Bill, {
        foreignKey: 'billId',
        as: 'bill'
      });
    }
  }

  BillSubmission.init({
    houseServiceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'HouseServices',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed'),
      defaultValue: 'pending'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      get() {
        const value = this.getDataValue('amount');
        return value === null ? null : Number(value);
      },
      set(value) {
        if (value !== null) {
          this.setDataValue('amount', Number(value).toFixed(2));
        }
      }
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    billId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Bills',
        key: 'id'
      }
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'BillSubmission',
  });

  // Add an afterCreate hook to send a push notification whenever a bill submission is created
  BillSubmission.addHook('afterCreate', async (billSubmission, options) => {
    try {
      // Lazy require to avoid circular dependencies
      const pushNotificationService = require('../services/pushNotificationService');

      // Retrieve the user associated with this bill submission
      const user = await billSubmission.getUser({ transaction: options.transaction });
      if (user) {
        // Customize the push notification message
        const message = "Heads up! You have a new bill submission. Please review it and take action.";
        const title = "New Bill Submission";

        await pushNotificationService.sendPushNotification(user, {
          title,
          message,
          data: {
            billSubmissionId: billSubmission.id
          }
        });
      }
    } catch (error) {
      console.error('Error sending push notification for BillSubmission:', error);
    }
  });

  return BillSubmission;
};
