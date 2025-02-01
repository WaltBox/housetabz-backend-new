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
    paymentStatus: {
      type: DataTypes.ENUM('not_required', 'pending', 'completed'),
      defaultValue: 'not_required'
    },
    paymentTransactionId: {
      type: DataTypes.STRING,
      allowNull: true
    }
  });

  // Before saving, update task status based on paymentStatus and response changes.
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

  // After saving a task, update the related ServiceRequestBundle accordingly.
  Task.addHook('afterSave', async (task, options) => {
    let transaction = options.transaction;
    let localTransaction = false;

    if (!transaction) {
      transaction = await sequelize.transaction();
      localTransaction = true;
    }

    try {
      // If payment status changed to completed (and payment is required), update the bundle's paid total.
      if (task.changed('paymentStatus') &&
          task.paymentStatus === 'completed' &&
          task.paymentRequired) {

        const bundle = await task.getServiceRequestBundle({ transaction });
        if (bundle) {
          console.log('Processing payment update:', {
            taskId: task.id,
            bundleId: bundle.id,
            currentTotal: bundle.totalPaidUpfront,
            addingAmount: task.paymentAmount
          });

          const currentTotal = Number(bundle.totalPaidUpfront || 0);
          const paymentAmount = Number(task.paymentAmount || 0);
          await bundle.update(
            { totalPaidUpfront: (currentTotal + paymentAmount).toFixed(2) },
            { transaction }
          );
          await bundle.updateStatusIfAllTasksCompleted({ transaction });
        }
      }

      // If the task's status or response has changed, check if the bundle should update.
      if (task.changed('status') || task.changed('response')) {
        const bundle = await task.getServiceRequestBundle({ transaction });
        if (bundle) {
          if (task.response === 'rejected') {
            await bundle.update({ status: 'rejected' }, { transaction });
            const stagedRequest = await bundle.getStagedRequest({ transaction });
            if (stagedRequest) {
              await stagedRequest.update({ status: 'rejected' }, { transaction });
            }
          } else if (task.status === true) {
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
