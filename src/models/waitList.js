// models/waitList.js
module.exports = (sequelize, DataTypes) => {
    const WaitList = sequelize.define('WaitList', {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    });
  
    WaitList.associate = (models) => {
      // If there are any relationships, define them here.
      // For example: WaitList.belongsTo(models.OtherModel, { foreignKey: 'otherModelId', as: 'otherModel' });
    };
  
    return WaitList;
  };
  