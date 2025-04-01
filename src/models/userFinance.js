// src/models/userFinance.js
module.exports = (sequelize, DataTypes) => {
    const UserFinance = sequelize.define('UserFinance', {
      userId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        unique: true,
        references: {
          model: 'Users',
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
      credit: {
        type: DataTypes.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0.00,
        get() {
          const value = this.getDataValue('credit');
          return value === null ? 0.00 : Number(value);
        },
        set(value) {
          this.setDataValue('credit', parseFloat(value || 0).toFixed(2));
        },
      },
      points: {
        type: DataTypes.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      lastTransactionDate: {
        type: DataTypes.DATE,
        allowNull: true,
      }
    }, {
      tableName: 'UserFinances',
      indexes: [
        { fields: ['userId'] }
      ]
    });
  
    UserFinance.associate = (models) => {
      UserFinance.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
    };
  
    return UserFinance;
  };