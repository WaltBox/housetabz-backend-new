module.exports = (sequelize, DataTypes) => {
  const Deal = sequelize.define('Deal', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    details: {
      type: DataTypes.TEXT,
      allowNull: true,
    },
    expiration_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  });

  Deal.associate = (models) => {
    Deal.belongsToMany(models.Partner, {
      through: 'DealPartners',
      foreignKey: 'deal_id',
      otherKey: 'partner_id',
    });
  };

  return Deal;
};
