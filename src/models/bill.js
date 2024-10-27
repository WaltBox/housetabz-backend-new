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
    });
  
    Bill.associate = (models) => {
      Bill.belongsTo(models.House, { foreignKey: 'houseId' });

      Bill.hasMany(models.Charge, { foreignKey: 'billId' });
    };
  
    return Bill;
  };
  