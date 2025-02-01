// src/models/ServiceRequestBundle.js
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

  ServiceRequestBundle.prototype.updateStatusIfAllTasksCompleted = async function() {
    try {
      // Get all tasks and staged request
      const [tasks, stagedRequest] = await Promise.all([
        sequelize.models.Task.findAll({
          where: { serviceRequestBundleId: this.id }
        }),
        sequelize.models.StagedRequest.findByPk(this.stagedRequestId)
      ]);

      if (!stagedRequest) return;

      // Calculate total paid
      const totalPaid = tasks
        .filter(task => task.paymentStatus === 'completed')
        .reduce((sum, task) => sum + Number(task.paymentAmount || 0), 0);

      // Check all conditions
      const allTasksComplete = tasks.every(task => task.status === true);
      const allTasksAccepted = tasks.every(task => task.response === 'accepted');
      const allPaymentsMet = totalPaid >= Number(stagedRequest.requiredUpfrontPayment || 0);

      // Log the check
      console.log('Status check:', {
        bundleId: this.id,
        totalPaid,
        requiredPayment: stagedRequest.requiredUpfrontPayment,
        allTasksComplete,
        allTasksAccepted,
        allPaymentsMet,
        taskCount: tasks.length
      });

      // Update total paid if needed
      if (this.totalPaidUpfront !== totalPaid) {
        await this.update({ totalPaidUpfront: totalPaid });
      }

      // Update statuses if all conditions are met
      if (allTasksComplete && allTasksAccepted && allPaymentsMet) {
        // Update both statuses
        await Promise.all([
          this.update({ status: 'accepted' }),
          stagedRequest.update({ status: 'authorized' })
        ]);

        // Send webhook
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