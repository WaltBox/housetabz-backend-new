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
      defaultValue: 0,
      validate: {
        min: 0
      },
      comment: 'Total amount collected from all roommates for upfront payment'
    }
  }, {
    indexes: [
      // Add indexes for frequently queried columns
      { fields: ['houseId'] },
      { fields: ['userId'] },
      { fields: ['stagedRequestId'] },
      { fields: ['status'] }
    ]
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

  ServiceRequestBundle.prototype.updateStatusIfAllTasksCompleted = async function () {
    const transaction = await sequelize.transaction();
    
    try {
      const stagedRequest = await sequelize.models.StagedRequest.findByPk(
        this.stagedRequestId,
        { transaction }
      );
      
      if (!stagedRequest) {
        throw new Error('Associated StagedRequest not found');
      }

      const tasks = await sequelize.models.Task.findAll({
        where: { serviceRequestBundleId: this.id },
        transaction
      });

      const allAccepted = tasks.every((task) => task.status === true);
      const allPaymentsMade = !stagedRequest.requiredUpfrontPayment || 
        this.totalPaidUpfront >= stagedRequest.requiredUpfrontPayment;

      if (allAccepted && allPaymentsMade && this.status !== 'accepted') {
        this.status = 'accepted';
        await this.save({ transaction });
      }

      await transaction.commit();
    } catch (error) {
      await transaction.rollback();
      console.error('Error checking/updating bundle status:', error);
      throw error; // Re-throw to handle in controller
    }
  };

  ServiceRequestBundle.addHook('afterUpdate', async (bundle, options) => {
    if (bundle.status === 'accepted') {
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
        console.error('Error updating staged request status:', error);
        throw error; // Re-throw to handle in controller
      }
    }
  });

  return ServiceRequestBundle;
};