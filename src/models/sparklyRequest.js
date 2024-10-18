// models/sparklyRequest.js
const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const SparklyRequest = sequelize.define('SparklyRequest', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    service_request_bundle_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: 'ServiceRequestBundles',
        key: 'id',
      },
    },
    roommate_accepted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
    house_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    service_date: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    service_time: {
      type: DataTypes.TIME,
      allowNull: true,
    },
    service_status: {
      type: DataTypes.ENUM(
        'not accepted',
        'ready for scheduling',
        'scheduled',
        'complete'
      ),
      defaultValue: 'not accepted',
    },
    num_rooms: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    house_size: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    frequency: {
      type: DataTypes.ENUM('weekly', 'biweekly', 'monthly'),
      allowNull: false,
    },
  });

  // Associations
  SparklyRequest.associate = (models) => {
    SparklyRequest.belongsTo(models.ServiceRequestBundle, {
      foreignKey: 'service_request_bundle_id',
    });
    SparklyRequest.belongsTo(models.House, {
      foreignKey: 'house_id',
    });
    SparklyRequest.belongsTo(models.User, {
      foreignKey: 'user_id',
    });
  };

  return SparklyRequest;
};
