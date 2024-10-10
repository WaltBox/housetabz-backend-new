module.exports = (sequelize, DataTypes) => {
    const ServiceRequestBundle = sequelize.define('ServiceRequestBundle', {
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      houseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      userId: {  // The roommate who submitted the request
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    });
  
    ServiceRequestBundle.associate = (models) => {
      ServiceRequestBundle.belongsTo(models.House, { foreignKey: 'houseId' });
      ServiceRequestBundle.belongsTo(models.User, { foreignKey: 'userId', as: 'submitter' });
      ServiceRequestBundle.hasMany(models.Task, { foreignKey: 'serviceRequestBundleId', as: 'tasks' });
    };
  
    return ServiceRequestBundle;
  };
  