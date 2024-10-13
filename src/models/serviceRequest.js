module.exports = (sequelize, DataTypes) => {
    const ServiceRequest = sequelize.define('ServiceRequest', {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      serviceRequestBundleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      accepted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
    });
  
    ServiceRequest.associate = (models) => {
      ServiceRequest.belongsTo(models.ServiceRequestBundle, { foreignKey: 'serviceRequestBundleId' });
      ServiceRequest.belongsTo(models.User, { foreignKey: 'userId' });
    };
  
    return ServiceRequest;
  };
  