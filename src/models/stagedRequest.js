module.exports = (sequelize, DataTypes) => {
    const StagedRequest = sequelize.define('StagedRequest', {
      partnerName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      transactionId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      serviceName: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      pricing: {
        type: DataTypes.FLOAT,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING, // 'staged', 'authorized', 'declined'
        allowNull: false,
        defaultValue: 'staged',
      },
    });
  
    StagedRequest.associate = (models) => {
      StagedRequest.hasOne(models.ServiceRequestBundle, {
        foreignKey: 'stagedRequestId',
        as: 'serviceRequestBundle',
      });
    };
  
    return StagedRequest;
  };
  