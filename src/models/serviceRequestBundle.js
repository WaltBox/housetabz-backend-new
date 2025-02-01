// src/models/ServiceRequestBundle.js
const webhookService = require('../services/webhookService');

module.exports = (sequelize, DataTypes) => {
  const ServiceRequestBundle = sequelize.define('ServiceRequestBundle', {
    houseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'House ID is required' }
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'User ID is required' }
      }
    },
    stagedRequestId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'Staged Request ID is required' }
      }
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
      validate: {
        isIn: {
          args: [['pending', 'accepted', 'rejected']],
          msg: 'Status must be either pending, accepted, or rejected'
        }
      }
    },
    totalPaidUpfront: {
      type: DataTypes.DECIMAL(10, 2),
      defaultValue: 0.00,
      get() {
        const value = this.getDataValue('totalPaidUpfront');
        return value === null ? 0.00 : Number(value);
      },
      set(value) {
        const numValue = Number(value);
        if (isNaN(numValue)) {
          throw new Error('Invalid numeric value for totalPaidUpfront');
        }
        this.setDataValue('totalPaidUpfront', numValue.toFixed(2));
      }
    }
  });

  ServiceRequestBundle.associate = function(models) {
    ServiceRequestBundle.belongsTo(models.StagedRequest, {
      foreignKey: 'stagedRequestId',
      as: 'stagedRequest'
    });
    ServiceRequestBundle.hasMany(models.Task, {
      foreignKey: 'serviceRequestBundleId',
      as: 'tasks'
    });
    ServiceRequestBundle.belongsTo(models.User, {
      foreignKey: 'userId',
      as: 'creator'
    });
  };

  ServiceRequestBundle.prototype.updateStatusIfAllTasksCompleted = async function(options = {}) {
    const transaction = options.transaction;
    try {
      // Get all tasks and the staged request within the same transaction context
      const [tasks, stagedRequest] = await Promise.all([
        sequelize.models.Task.findAll({
          where: { serviceRequestBundleId: this.id },
          transaction
        }),
        sequelize.models.StagedRequest.findByPk(this.stagedRequestId, { transaction })
      ]);

      if (!stagedRequest) return;

      // Calculate total paid based on tasks with completed payments
      const totalPaid = tasks
        .filter(task => task.paymentStatus === 'completed')
        .reduce((sum, task) => sum + Number(task.paymentAmount || 0), 0);

      // Check conditions: all tasks are complete, accepted, and required payments are met
      const allTasksComplete = tasks.every(task => task.status === true);
      const allTasksAccepted = tasks.every(task => task.response === 'accepted');
      const requiredPayment = Number(stagedRequest.requiredUpfrontPayment || 0);
      const allPaymentsMet = totalPaid >= requiredPayment;

      console.log('Status check:', {
        bundleId: this.id,
        totalPaid,
        requiredPayment,
        allTasksComplete,
        allTasksAccepted,
        allPaymentsMet,
        taskCount: tasks.length
      });

      // Update the totalPaidUpfront if there is a discrepancy
      if (Number(this.totalPaidUpfront) !== totalPaid) {
        await this.update({ totalPaidUpfront: totalPaid.toFixed(2) }, { transaction });
      }

      // If every task is complete, accepted, and payments meet the required amount,
      // update the bundle and the related staged request, then send the webhook.
      if (allTasksComplete && allTasksAccepted && allPaymentsMet) {
        await Promise.all([
          this.update({ status: 'accepted' }, { transaction }),
          stagedRequest.update({ status: 'authorized' }, { transaction })
        ]);

        try {
          await webhookService.sendWebhook(
            stagedRequest.partnerId,
            'request.authorized',
            {
              stagedRequestId: stagedRequest.id,
              status: 'authorized',
              transactionId: stagedRequest.transactionId,
              serviceName: stagedRequest.serviceName,
              serviceType: stagedRequest.serviceType,
              estimatedAmount: stagedRequest.estimatedAmount,
              requiredUpfrontPayment: stagedRequest.requiredUpfrontPayment
            }
          );
        } catch (error) {
          console.error('Webhook error:', error);
        }
      }
    } catch (error) {
      console.error('Error updating bundle status:', error);
    }
  };

  return ServiceRequestBundle;
};
