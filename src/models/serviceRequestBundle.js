// src/models/ServiceRequestBundle.js
module.exports = (sequelize, DataTypes) => {
  const ServiceRequestBundle = sequelize.define('ServiceRequestBundle', {
    // House ID that this bundle belongs to
    houseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'House ID is required' }
      }
    },

    // User ID of the person who created the bundle
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'User ID is required' }
      }
    },

    // Reference to the staged request
    stagedRequestId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        notNull: { msg: 'Staged Request ID is required' }
      }
    },

    // Bundle status (pending, accepted, rejected)
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

    // Total amount paid upfront by all roommates
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
        this.setDataValue('totalPaidUpfront', Number(numValue).toFixed(2));
      },
      validate: {
        isDecimal: true,
        min: 0
      }
    }
  }, {
    indexes: [
      { fields: ['houseId'] },
      { fields: ['userId'] },
      { fields: ['stagedRequestId'] },
      { fields: ['status'] }
    ]
  });

  // Define associations
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

  // Method to check and update bundle status
  ServiceRequestBundle.prototype.updateStatusIfAllTasksCompleted = async function () {
    const transaction = await sequelize.transaction();
    
    try {
      // Get the associated staged request
      const stagedRequest = await sequelize.models.StagedRequest.findByPk(
        this.stagedRequestId,
        { transaction }
      );
      
      if (!stagedRequest) {
        throw new Error('Associated StagedRequest not found');
      }

      // Get all tasks for this bundle
      const tasks = await sequelize.models.Task.findAll({
        where: { serviceRequestBundleId: this.id },
        transaction
      });

      // Check conditions for completion
      const allTasksAccepted = tasks.every(task => task.response === 'accepted');
      const tasksRequiringPayment = tasks.filter(task => task.paymentRequired);
      const allPaymentsCompleted = tasksRequiringPayment.every(
        task => task.paymentStatus === 'completed'
      );

      // Check upfront payment requirement
      const requiredUpfrontPayment = Number(stagedRequest.requiredUpfrontPayment || 0);
      const currentPaidUpfront = Number(this.totalPaidUpfront || 0);
      const upfrontPaymentMet = requiredUpfrontPayment === 0 || 
                               currentPaidUpfront >= requiredUpfrontPayment;

      // Log the status check
      console.log('Bundle status check:', {
        bundleId: this.id,
        allTasksAccepted,
        allPaymentsCompleted,
        upfrontPaymentMet,
        requiredUpfrontPayment,
        currentPaidUpfront
      });

      // Update status if all conditions are met
      if (allTasksAccepted && allPaymentsCompleted && upfrontPaymentMet && 
          this.status !== 'accepted') {
        this.status = 'accepted';
        await this.save({ transaction });

        // Update staged request status
        stagedRequest.status = 'authorized';
        await stagedRequest.save({ transaction });

        console.log(`Bundle ${this.id} and staged request ${stagedRequest.id} updated to accepted/authorized`);
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('Error in updateStatusIfAllTasksCompleted:', error);
      throw error;
    }
  };

  // Hook to check status after payment updates
  ServiceRequestBundle.addHook('afterUpdate', async (bundle, options) => {
    try {
      // If totalPaidUpfront changed, check if we need to update status
      if (bundle.changed('totalPaidUpfront')) {
        await bundle.updateStatusIfAllTasksCompleted();
      }
      
      // If status changed to accepted, ensure staged request is updated
      if (bundle.changed('status') && bundle.status === 'accepted') {
        const transaction = options.transaction || await sequelize.transaction();
        
        try {
          const stagedRequest = await sequelize.models.StagedRequest.findByPk(
            bundle.stagedRequestId,
            { transaction }
          );
          
          if (stagedRequest) {
            stagedRequest.status = 'authorized';
            await stagedRequest.save({ transaction });
          }

          if (!options.transaction) await transaction.commit();
        } catch (error) {
          if (!options.transaction) await transaction.rollback();
          throw error;
        }
      }
    } catch (error) {
      console.error('Error in afterUpdate hook:', error);
      throw error;
    }
  });

  return ServiceRequestBundle;
};