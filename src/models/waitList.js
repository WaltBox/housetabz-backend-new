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
      referrerId: {
        type: DataTypes.UUID,
        allowNull: true,
      },
    });
  
    WaitList.associate = (models) => {
      WaitList.belongsTo(models.Referrer, { foreignKey: 'referrerId', as: 'referrer' });
    };
  
    return WaitList;
  };
  