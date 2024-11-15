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
    // New fields for storing URLs to the images
    logo: {
      type: DataTypes.STRING, // URL to logo image
      allowNull: true,
    },
    marketplace_cover: {
      type: DataTypes.STRING, // URL to marketplace cover image
      allowNull: true,
    },
    company_cover: {
      type: DataTypes.STRING, // URL to company cover image
      allowNull: true,
    },
    // New fields for additional text information
    about: {
      type: DataTypes.TEXT, // Text content for about section
      allowNull: true,
    },
    important_information: {
      type: DataTypes.TEXT, // Text content for important information section
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
