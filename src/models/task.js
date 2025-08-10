// src/models/Task.js
module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define('Task', {
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
      comment: 'Indicates if task is complete (paid if required, or just accepted if no payment needed)'
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    serviceRequestBundleId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'ServiceRequestBundles',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    response: {
      type: DataTypes.ENUM('pending', 'accepted', 'rejected'),
      defaultValue: 'pending',
    },
    paymentRequired: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    paymentAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      get() {
        const value = this.getDataValue('paymentAmount');
        return value === null ? null : Number(value);
      },
      set(value) {
        if (value !== null) {
          this.setDataValue('paymentAmount', Number(value).toFixed(2));
        }
      }
    },
    monthlyAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      comment: 'Monthly share amount for recurring services',
      get() {
        const value = this.getDataValue('monthlyAmount');
        return value === null ? null : Number(value);
      },
      set(value) {
        if (value !== null) {
          this.setDataValue('monthlyAmount', Number(value).toFixed(2));
        }
      }
    },
    paymentStatus: {
      type: DataTypes.ENUM('not_required', 'pending', 'authorized', 'completed', 'cancelled'),
      defaultValue: 'not_required'
    },
    paymentTransactionId: {
      type: DataTypes.STRING,
      allowNull: true
    },
    stripePaymentIntentId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Stripe Payment Intent ID for consent-based payments'
    }
  });

  // Existing hooks for beforeSave and afterSave...
  Task.addHook('beforeSave', async (task, options) => {
    if (task.changed('paymentStatus') && task.paymentStatus === 'completed') {
      if (task.response === 'accepted') {
        task.status = true;
      }
    }

    if (task.changed('response')) {
      if (task.response === 'rejected') {
        task.status = true; // Task is complete when rejected
      } else if (task.response === 'accepted' && !task.paymentRequired) {
        task.status = true; // Task is complete if accepted and no payment is needed
      }
    }
  });

  Task.addHook('afterSave', async (task, options) => {
    let transaction = options.transaction;
    let localTransaction = false;

    if (!transaction) {
      transaction = await sequelize.transaction();
      localTransaction = true;
    }

    try {
      if (task.changed('paymentStatus') &&
          task.paymentStatus === 'completed' &&
          task.paymentRequired) {

        const bundle = await task.getServiceRequestBundle({ transaction });
        if (bundle) {
          const currentTotal = Number(bundle.totalPaidUpfront || 0);
          const paymentAmount = Number(task.paymentAmount || 0);
          await bundle.update(
            { totalPaidUpfront: (currentTotal + paymentAmount).toFixed(2) },
            { transaction }
          );
          await bundle.updateStatusIfAllTasksCompleted({ transaction });
        }
      }

      if (task.changed('status') || task.changed('response')) {
        const bundle = await task.getServiceRequestBundle({
          transaction,
          include: [
            {
              model: sequelize.models.StagedRequest,
              as: 'stagedRequest'
            },
            {
              model: sequelize.models.VirtualCardRequest,
              as: 'virtualCardRequest'
            }
          ]
        });

        if (bundle) {
          if (task.response === 'rejected') {
            await bundle.update({ status: 'rejected' }, { transaction });
            if (bundle.stagedRequest) {
              await bundle.stagedRequest.update({ status: 'rejected' }, { transaction });
            }
            if (bundle.virtualCardRequest) {
              await bundle.virtualCardRequest.update({ status: 'rejected' }, { transaction });
            }
            
            // Cancel payment intents when request is rejected
            // Note: We'll do this after transaction commits to avoid blocking the transaction
            transaction.afterCommit(async () => {
              try {
                const taskController = require('../controllers/taskController');
                await taskController.cancelAllPaymentIntents(bundle.id);
              } catch (error) {
                console.error('Error cancelling payment intents after rejection:', error);
              }
            });
          } else if (task.status === true && (!task.paymentRequired || task.paymentStatus === 'completed')) {
            // Only update bundle status if task is complete AND either no payment required OR payment is completed
            await bundle.updateStatusIfAllTasksCompleted({ transaction });
          }
        }
      }

      if (localTransaction) await transaction.commit();
    } catch (error) {
      if (localTransaction) await transaction.rollback();
      console.error('Error in Task afterSave hook:', error);
      throw error;
    }
  });

  // Newly added afterCreate hook for sending push notifications
  // Newly added afterCreate hook for sending push notifications
Task.addHook('afterCreate', async (task, options) => {
  try {
    // Only push if task.status is false (i.e. not yet complete)
    if (task.status === false) {
      const pushNotificationService = require('../services/pushNotificationService');
      
      // Retrieve the associated user
      const user = await task.getUser();
      if (user) {
        const message = "Heads up! You have a new task awaiting your action. Tap to review and get started.";
        await pushNotificationService.sendPushNotification(user, {
          title: "New Task Alert",
          message,
          data: { taskId: task.id }
        });
      }
    }
  } catch (error) {
    console.error('Error sending push notification in Task.afterCreate hook:', error);
  }
});


  Task.associate = (models) => {
    Task.belongsTo(models.ServiceRequestBundle, {
      foreignKey: 'serviceRequestBundleId',
      as: 'serviceRequestBundle',
    });
    Task.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'user',
    });
  };

  return Task;
};
