module.exports = (sequelize, DataTypes) => {
  const Bill = sequelize.define('Bill', {
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    paid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false, // unpaid by default
    },
    houseService_id: { // Add houseService_id as a foreign key
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false, // Set to false if the field is required
    },
  });

  Bill.associate = (models) => {
    // Bill belongs to House
    Bill.belongsTo(models.House, { foreignKey: 'houseId' });

    // Bill belongs to HouseService
    Bill.belongsTo(models.HouseService, { foreignKey: 'houseService_id', as: 'houseService' });

    // Bill has many Charges
    Bill.hasMany(models.Charge, { foreignKey: 'billId' });
  };

  return Bill;
};
