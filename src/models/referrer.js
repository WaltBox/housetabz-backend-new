module.exports = (sequelize, DataTypes) => {
    const Referrer = sequelize.define('Referrer', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
      referralLink: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true,
      },
    });
  
    Referrer.associate = (models) => {
      Referrer.hasMany(models.WaitList, { foreignKey: 'referrerId', as: 'referrals' });
    };
  
    return Referrer;
  };
  