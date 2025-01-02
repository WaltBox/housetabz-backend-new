module.exports = (sequelize, DataTypes) => {
  const Task = sequelize.define('Task', {
    type: {
      type: DataTypes.STRING, // e.g., 'service_request'
      allowNull: false,
    },
    status: {
      type: DataTypes.BOOLEAN, // true if completed
      defaultValue: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    serviceRequestBundleId: {
      type: DataTypes.INTEGER,
      allowNull: true, // Nullable for non-service-request tasks
      references: {
        model: 'ServiceRequestBundles',
        key: 'id',
      },
      onDelete: 'CASCADE',
    },
    response: {
      type: DataTypes.STRING, // 'accepted' or 'rejected'
      allowNull: true,
    },
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
