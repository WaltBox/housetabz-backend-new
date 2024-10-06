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
  
    return Partner;
  };
  