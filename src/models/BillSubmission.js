// src/models/BillSubmission.js
const { Model } = require('sequelize');

module.exports = (sequelize, DataTypes) => {
  class BillSubmission extends Model {
    static associate(models) {
      BillSubmission.belongsTo(models.HouseService, {
        foreignKey: 'houseServiceId',
        as: 'houseService'
      });
      BillSubmission.belongsTo(models.User, {
        foreignKey: 'userId',
        as: 'user'
      });
      BillSubmission.belongsTo(models.Bill, {
        foreignKey: 'billId',
        as: 'bill'
      });
    }
  }

  BillSubmission.init({
    houseServiceId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'HouseServices',
        key: 'id'
      }
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Users',
        key: 'id'
      }
    },
    status: {
      type: DataTypes.ENUM('pending', 'completed'),
      defaultValue: 'pending'
    },
    amount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      get() {
        const value = this.getDataValue('amount');
        return value === null ? null : Number(value);
      },
      set(value) {
        if (value !== null) {
          this.setDataValue('amount', Number(value).toFixed(2));
        }
      }
    },
    dueDate: {
      type: DataTypes.DATE,
      allowNull: false
    },
    billId: {
      type: DataTypes.INTEGER,
      allowNull: true,
      references: {
        model: 'Bills',
        key: 'id'
      }
    },
    metadata: {
      type: DataTypes.JSONB,
      defaultValue: {}
    }
  }, {
    sequelize,
    modelName: 'BillSubmission',
  });

  return BillSubmission;
};