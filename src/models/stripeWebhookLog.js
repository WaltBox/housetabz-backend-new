// models/StripeWebhookLog.js
module.exports = (sequelize, DataTypes) => {
    const StripeWebhookLog = sequelize.define('StripeWebhookLog', {
      stripe_event_id: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
      },
      event_type: {
        type: DataTypes.STRING,
        allowNull: false
      },
      payload: {
        type: DataTypes.JSON,
        allowNull: false
      },
      status: {
        type: DataTypes.ENUM('processing', 'completed', 'failed'),
        defaultValue: 'processing'
      },
      error: {
        type: DataTypes.TEXT,
        allowNull: true
      }
    }, {
      tableName: 'stripe_webhook_logs',
      underscored: true,
      timestamps: true
    });
  
    return StripeWebhookLog;
  };