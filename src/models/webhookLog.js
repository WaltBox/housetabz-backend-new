// models/webhookLog.js
module.exports = (sequelize, DataTypes) => {
  const WebhookLog = sequelize.define('WebhookLog', {
    partner_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'Partners',
        key: 'id'
      }
    },
    event_type: {  // Changed to match DB column name
      type: DataTypes.STRING,
      allowNull: false,
      field: 'event_type'  // Explicitly specify DB column name
    },
    payload: {
      type: DataTypes.JSON,
      allowNull: false,
    },
    status: {
      type: DataTypes.ENUM('success', 'failed'),
      allowNull: false,
    },
    status_code: {  // Changed to match DB column name
      type: DataTypes.INTEGER,
      allowNull: true,
      field: 'status_code'  // Explicitly specify DB column name
    },
    response: {
      type: DataTypes.JSON,
      allowNull: true,
    },
    error: {
      type: DataTypes.TEXT,
      allowNull: true,
    }
  }, {
    tableName: 'webhook_logs',  // Explicitly use lowercase table name
    underscored: true,
    timestamps: true,
    createdAt: 'created_at',  // Match your DB column names
    updatedAt: 'updated_at'
  });

  WebhookLog.associate = (models) => {
    WebhookLog.belongsTo(models.Partner, {
      foreignKey: 'partner_id',
      as: 'partner'
    });
  };

  return WebhookLog;
};