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
      allowNull: true,
      references: {
        model: 'StagedRequests',
        key: 'id'
      }
    },
    virtualCardRequestId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'VirtualCardRequests',
        key: 'id'
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
    ServiceRequestBundle.belongsTo(models.VirtualCardRequest, {
      foreignKey: 'virtualCardRequestId',
      as: 'virtualCardRequest'
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
      // Get all tasks and either staged request or virtual card request
      const [tasks, stagedRequest, virtualCardRequest] = await Promise.all([
        sequelize.models.Task.findAll({
          where: { serviceRequestBundleId: this.id },
          transaction
        }),
        this.stagedRequestId ? sequelize.models.StagedRequest.findByPk(this.stagedRequestId, { transaction }) : null,
        this.virtualCardRequestId ? sequelize.models.VirtualCardRequest.findByPk(this.virtualCardRequestId, { transaction }) : null
      ]);

      // Get the relevant request (either staged or virtual card)
      const request = stagedRequest || virtualCardRequest;
      if (!request) return;

      // Calculate total paid based on tasks with completed payments
      const totalPaid = tasks
        .filter(task => task.paymentStatus === 'completed')
        .reduce((sum, task) => sum + Number(task.paymentAmount || 0), 0);

      // Check conditions: all tasks are complete, accepted, and required payments are met
      const allTasksComplete = tasks.every(task => task.status === true);
      const allTasksAccepted = tasks.every(task => task.response === 'accepted');
      const requiredPayment = Number(request.requiredUpfrontPayment || 0);
      const allPaymentsMet = totalPaid >= requiredPayment;

      console.log('Status check:', {
        bundleId: this.id,
        totalPaid,
        requiredPayment,
        allTasksComplete,
        allTasksAccepted,
        allPaymentsMet,
        taskCount: tasks.length,
        requestType: stagedRequest ? 'staged' : 'virtual_card'
      });

      // Update the totalPaidUpfront if there is a discrepancy
      if (Number(this.totalPaidUpfront) !== totalPaid) {
        await this.update({ totalPaidUpfront: totalPaid.toFixed(2) }, { transaction });
      }

      // If every task is complete, accepted, and payments meet the required amount,
      // update the bundle and the related request
      if (allTasksComplete && allTasksAccepted && allPaymentsMet) {
        const updates = [
          this.update({ status: 'accepted' }, { transaction })
        ];

        if (stagedRequest) {
          // For staged requests, update status and send webhook
          updates.push(stagedRequest.update({ status: 'authorized' }, { transaction }));
          
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
        } else if (virtualCardRequest) {
          // For virtual card requests, update status and create card
          try {
            const stripeHouseService = require('../services/StripeHouseService');
            updates.push(virtualCardRequest.update({ status: 'active' }, { transaction }));
            
            // Create the virtual card
            const card = await stripeHouseService.createVirtualCard(virtualCardRequest.id);
            console.log('Virtual card created:', card);
          } catch (error) {
            console.error('Error creating virtual card:', error);
            throw error;
          }
        }

        await Promise.all(updates);
      }
    } catch (error) {
      console.error('Error updating bundle status:', error);
    }
  };

  return ServiceRequestBundle;
};