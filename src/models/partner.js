// src/models/partner.js
module.exports = (sequelize, DataTypes) => {
  const Partner = sequelize.define('Partner', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
    },
    description: {
      type: DataTypes.STRING,
      allowNull: true,
    },
  });

  // Partner can have multiple service plans
  Partner.associate = (models) => {
    Partner.hasMany(models.ServicePlan, {
      foreignKey: 'partnerId',
      onDelete: 'CASCADE',
    });
  };

  return Partner;
};
