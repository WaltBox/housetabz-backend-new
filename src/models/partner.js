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
    logo: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    marketplace_cover: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    company_cover: {
      type: DataTypes.STRING,
      allowNull: true,
    },
    about: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    important_information: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    type: {
      type: DataTypes.ENUM('plannable', 'formable'),
      allowNull: false,
      defaultValue: 'plannable',
    },
  });

  Partner.associate = (models) => {
    Partner.belongsToMany(models.Deal, {
      through: 'DealPartners',
      foreignKey: 'partner_id',
      otherKey: 'deal_id',
    });
  };

  return Partner;
};
