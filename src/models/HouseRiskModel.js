// src/models/houseRiskHistory.js - FIXED VERSION
module.exports = (sequelize, DataTypes) => {
    const HouseRiskHistory = sequelize.define('HouseRiskHistory', {
      houseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Houses',
          key: 'id'
        },
        onUpdate: 'CASCADE',
        onDelete: 'CASCADE'
      },
      assessmentDate: {
        type: DataTypes.DATE,
        allowNull: false
      },
      riskFactor: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: true,
        get() {
          const value = this.getDataValue('riskFactor');
          return value === null ? null : Number(value);
        },
        set(value) {
          this.setDataValue('riskFactor', value === null ? null : parseFloat(value).toFixed(4));
        }
      },
      trendFactor: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: true,
        get() {
          const value = this.getDataValue('trendFactor');
          return value === null ? null : Number(value);
        },
        set(value) {
          this.setDataValue('trendFactor', value === null ? null : parseFloat(value).toFixed(4));
        }
      },
      multiplier: {
        type: DataTypes.DECIMAL(5, 4),
        allowNull: true,
        get() {
          const value = this.getDataValue('multiplier');
          return value === null ? null : Number(value);
        },
        set(value) {
          this.setDataValue('multiplier', value === null ? null : parseFloat(value).toFixed(4));
        }
      },
      hsiScore: {
        type: DataTypes.INTEGER,
        allowNull: true,
        validate: { min: 0, max: 100 }
      },
      feeMultiplier: {
        type: DataTypes.DECIMAL(4, 2),
        allowNull: true,
        get() {
          const value = this.getDataValue('feeMultiplier');
          return value === null ? null : Number(value);
        },
        set(value) {
          this.setDataValue('feeMultiplier', value === null ? null : parseFloat(value).toFixed(2));
        }
      },
      snapshotType: {
        type: DataTypes.ENUM('weekly', 'monthly', 'quarterly', 'significant_change', 'manual'),
        allowNull: false,
        defaultValue: 'weekly'
        // REMOVED the comment to avoid PostgreSQL sync issues
      },
      metadata: {
        type: DataTypes.JSONB,
        allowNull: true,
        defaultValue: {}
      }
    }, {
      tableName: 'HouseRiskHistories',
      indexes: [
        { fields: ['houseId'] },
        { fields: ['assessmentDate'] },
        { fields: ['snapshotType'] },
        { fields: ['houseId', 'assessmentDate'] },
        { fields: ['createdAt'] }
      ]
    });
  
    HouseRiskHistory.associate = (models) => {
      HouseRiskHistory.belongsTo(models.House, {
        foreignKey: 'houseId',
        as: 'house'
      });
    };
  
    return HouseRiskHistory;
  };