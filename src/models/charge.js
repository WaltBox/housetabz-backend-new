module.exports = (sequelize, DataTypes) => {
  const Charge = sequelize.define('Charge', {
    amount: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    paid: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: false,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false, // Set to `false` if this field is required
    },
  });

  Charge.associate = (models) => {
    Charge.belongsTo(models.User, { foreignKey: 'userId' });
    Charge.belongsTo(models.Bill, { foreignKey: 'billId' });
  };

  return Charge;
};
