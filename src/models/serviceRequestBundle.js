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
    userId: { // The roommate who submitted the request
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    roommate_accepted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // Default to not accepted
    },
  });

  ServiceRequestBundle.associate = (models) => {
    ServiceRequestBundle.belongsTo(models.House, { foreignKey: 'houseId' });
    ServiceRequestBundle.belongsTo(models.User, { foreignKey: 'userId', as: 'submitter' });
    ServiceRequestBundle.hasMany(models.ServiceRequest, { foreignKey: 'serviceRequestBundleId' });
  };

  return ServiceRequestBundle;
};
