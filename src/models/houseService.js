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

  // Add associations
  HouseService.associate = (models) => {
    HouseService.belongsTo(models.House, {
      foreignKey: 'houseId',
      onDelete: 'CASCADE',
    });

    // Add association to Partner
    HouseService.belongsTo(models.Partner, {
      foreignKey: 'partnerId',
      onDelete: 'CASCADE',
    });

    // Optionally associate with ServicePlan
    HouseService.belongsTo(models.ServicePlan, {
      foreignKey: 'servicePlanId',
      onDelete: 'SET NULL',
    });
  };

  return HouseService;
};
