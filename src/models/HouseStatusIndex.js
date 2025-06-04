// src/models/HouseStatusIndex.js - UPDATED VERSION
module.exports = (sequelize, DataTypes) => {
  const HouseStatusIndex = sequelize.define('HouseStatusIndex', {
    score: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 50,
      validate: { min: 0, max: 100 }
    },
    bracket: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 5,
      comment: 'HSI bracket (0-10) for fee calculations'
    },
    feeMultiplier: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false,
      defaultValue: 1.0,
      comment: 'Multiplier applied to service fees'
    },
    creditMultiplier: {
      type: DataTypes.DECIMAL(4, 2),
      allowNull: false, 
      defaultValue: 1.0,
      comment: 'Multiplier applied to credit limits'
    },
    updatedReason: {
      type: DataTypes.STRING,
      allowNull: true,
      comment: 'Reason for the last HSI update'
    },
    // NEW RISK ASSESSMENT FIELDS
    lastRiskAssessment: {
      type: DataTypes.DATE,
      allowNull: true,
      comment: 'Date of last risk assessment'
    },
    currentRiskFactor: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      defaultValue: 0.0000,
      comment: 'Current payment risk factor (0.0000 to 1.0000)',
      get() {
        const value = this.getDataValue('currentRiskFactor');
        return value === null ? 0.0000 : Number(value);
      },
      set(value) {
        this.setDataValue('currentRiskFactor', value === null ? 0.0000 : parseFloat(value).toFixed(4));
      }
    },
    trendFactor: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      defaultValue: 1.0000,
      comment: 'Trend adjustment factor (usually 0.95 to 1.05)',
      get() {
        const value = this.getDataValue('trendFactor');
        return value === null ? 1.0000 : Number(value);
      },
      set(value) {
        this.setDataValue('trendFactor', value === null ? 1.0000 : parseFloat(value).toFixed(4));
      }
    },
    riskMultiplier: {
      type: DataTypes.DECIMAL(5, 4),
      allowNull: true,
      defaultValue: 1.0000,
      comment: 'Final risk multiplier applied to HSI',
      get() {
        const value = this.getDataValue('riskMultiplier');
        return value === null ? 1.0000 : Number(value);
      },
      set(value) {
        this.setDataValue('riskMultiplier', value === null ? 1.0000 : parseFloat(value).toFixed(4));
      }
    },
    unpaidChargesCount: {
      type: DataTypes.INTEGER,
      allowNull: true,
      defaultValue: 0,
      comment: 'Number of currently unpaid charges'
    },
    unpaidAmount: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
      defaultValue: 0.00,
      comment: 'Total amount of unpaid charges',
      get() {
        const value = this.getDataValue('unpaidAmount');
        return value === null ? 0.00 : Number(value);
      },
      set(value) {
        this.setDataValue('unpaidAmount', parseFloat(value || 0).toFixed(2));
      }
    },
    riskDetails: {
      type: DataTypes.JSONB,
      allowNull: true,
      defaultValue: {},
      comment: 'Detailed risk assessment breakdown'
    },
    // Explicitly define the foreign key field
    houseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Houses',
        key: 'id'
      },
      onUpdate: 'CASCADE',
      onDelete: 'CASCADE'
    }
  }, {
    tableName: 'HouseStatusIndexes',
    indexes: [
      { fields: ['houseId'] },
      { fields: ['lastRiskAssessment'] },
      { fields: ['score'] },
      { fields: ['bracket'] }
    ]
  });

  HouseStatusIndex.associate = (models) => {
    HouseStatusIndex.belongsTo(models.House, {
      foreignKey: 'houseId',
      as: 'house'
    });
  };

  return HouseStatusIndex;
};