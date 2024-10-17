module.exports = (sequelize, DataTypes) => {
    const SparklyRequest = sequelize.define('SparklyRequest', {
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      house_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      service_parameters: {
        type: DataTypes.JSON, // Store service parameters like rooms, bathrooms, etc.
        allowNull: false,
      },
      amount: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
      },
      roommate_accepted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false,
      },
      serviceRequestBundleId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'ServiceRequestBundles',
          key: 'id',
        },
      },
    });
  
    return SparklyRequest;
  };
  