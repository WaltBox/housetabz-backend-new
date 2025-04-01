// src/models/houseFinance.js
module.exports = (sequelize, DataTypes) => {
    const HouseFinance = sequelize.define('HouseFinance', {
      houseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'Houses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      balance: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        get() {
          const value = this.getDataValue('balance');
          return value === null ? 0.00 : Number(value);
        },
        set(value) {
          this.setDataValue('balance', parseFloat(value || 0).toFixed(2));
        },
      },
      ledger: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        comment: 'Running total of all transactions',
        get() {
          const value = this.getDataValue('ledger');
          return value === null ? 0.00 : Number(value);
        },
        set(value) {
          this.setDataValue('ledger', parseFloat(value || 0).toFixed(2));
        },
      },
      lastTransactionDate: {
        type: DataTypes.DATE,
        allowNull: true,
      }
    }, {
      tableName: 'HouseFinances',
      indexes: [
        { fields: ['houseId'] }
      ]
    });
  
    HouseFinance.associate = (models) => {
      HouseFinance.belongsTo(models.House, {
        foreignKey: 'houseId',
        as: 'house'
      });
    };
  
    return HouseFinance;
  };