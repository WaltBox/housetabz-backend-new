// src/models/houseService.js
module.exports = (sequelize, DataTypes) => {
    const HouseService = sequelize.define('HouseService', {
      houseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      partnerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      servicePlanId: {
        type: DataTypes.INTEGER,
        allowNull: true,  // This makes servicePlanId optional
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    });
  
    return HouseService;
  };
  