
module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define('Task', {
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
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
      comment: 'Individual roommate share of any upfront payment'
    },
    paymentStatus: {
      type: DataTypes.ENUM('not_required', 'pending', 'completed'),
      defaultValue: 'not_required'
    },
    paymentTransactionId: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Reference to payment transaction if payment was required'
    }
  });

  Task.addHook('afterUpdate', async (task) => {
    if (task.paymentStatus === 'completed' && task.paymentAmount) {
      const bundle = await task.getServiceRequestBundle();
      if (bundle) {
        bundle.totalPaidUpfront += task.paymentAmount;
        await bundle.save();
        await bundle.updateStatusIfAllTasksCompleted();
      }
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
