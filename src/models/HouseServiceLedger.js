module.exports = (sequelize, DataTypes) => {
    const HouseServiceLedger = sequelize.define('HouseServiceLedger', {
      houseServiceId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: { model: 'HouseServices', key: 'id' },
        onDelete: 'CASCADE'
      },
      billId: {
        type: DataTypes.INTEGER,
        allowNull: true,
        references: { model: 'Bills', key: 'id' },
        onDelete: 'SET NULL'
      },
      fundingRequired: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
      },
      funded: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
      },
      amountFronted: {
        type: DataTypes.DECIMAL(10, 2),
        defaultValue: 0.00
      },
      cycleStart: {
        type: DataTypes.DATE,
        defaultValue: DataTypes.NOW
      },
      cycleEnd: {
        type: DataTypes.DATE,
        allowNull: true
      },
      status: {
        type: DataTypes.ENUM('active', 'closed'),
        defaultValue: 'active'
      }
    }, {
      tableName: 'HouseServiceLedgers'
    });
  
    HouseServiceLedger.associate = (models) => {
      HouseServiceLedger.belongsTo(models.HouseService, {
        foreignKey: 'houseServiceId',
        as: 'houseService'
      });
  
      HouseServiceLedger.belongsTo(models.Bill, {
        foreignKey: 'billId',
        as: 'bill'
      });
    };
  
    return HouseServiceLedger;
  };
  