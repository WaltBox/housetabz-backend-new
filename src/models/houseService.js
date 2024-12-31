module.exports = (sequelize, DataTypes) => {
  const HouseService = sequelize.define('HouseService', {
    name: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
    },
    type: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    houseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
  });

  HouseService.associate = (models) => {
    // Relationship with House
    HouseService.belongsTo(models.House, { foreignKey: 'houseId' });

    // New association: HouseService has many Bills
    HouseService.hasMany(models.Bill, { foreignKey: 'houseService_id', as: 'bills' });
  };

  return HouseService;
};
