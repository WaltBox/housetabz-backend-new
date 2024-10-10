module.exports = (sequelize, DataTypes) => {
    const Task = sequelize.define('Task', {
      type: {
        type: DataTypes.STRING,
        allowNull: false,  // e.g., 'service request', 'payment'
      },
      status: {
        type: DataTypes.BOOLEAN,  // Change status to a boolean
        allowNull: false,
        defaultValue: false,  // Default to false
      },
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      serviceRequestBundleId: {  // Only for tasks related to service requests
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      response: {  // New column for response ('accepted' or 'rejected'). This will be used primarily for accepting or rejecting service requests
        type: DataTypes.STRING,
        allowNull: true,
        validate: {
          isIn: [['accepted', 'rejected']],  // Restrict values to 'accepted' or 'rejected'
        }
      },
    });
  
    Task.associate = (models) => {
      Task.belongsTo(models.User, { foreignKey: 'userId' });
    //   Task.belongsTo(models.ServiceRequestBundle, { foreignKey: 'serviceRequestBundleId', allowNull: true });
      Task.belongsTo(models.ServiceRequestBundle, { foreignKey: 'serviceRequestBundleId', as: 'serviceRequestBundle' });
    };
  
    return Task;
  };
  