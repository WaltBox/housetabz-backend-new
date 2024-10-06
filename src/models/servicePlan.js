// src/models/servicePlan.js
module.exports = (sequelize, DataTypes) => {
    const ServicePlan = sequelize.define('ServicePlan', {
      partnerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Partners',
          key: 'id',
        },
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      price: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      details: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    });
  
    ServicePlan.associate = (models) => {
      ServicePlan.belongsTo(models.Partner, {
        foreignKey: 'partnerId',
        onDelete: 'CASCADE',
      });
    };
  
    return ServicePlan;
  };
  