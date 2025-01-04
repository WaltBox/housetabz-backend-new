module.exports = (sequelize, DataTypes) => {
    const PartnerKey = sequelize.define('PartnerKey', {
      id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      partnerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'Partners',
          key: 'id',
        },
      },
      api_key: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      secret_key: {
        type: DataTypes.STRING,
        allowNull: false,
      },
    });
  
    PartnerKey.associate = (models) => {
      PartnerKey.belongsTo(models.Partner, {
        foreignKey: 'partnerId',
        onDelete: 'CASCADE',
      });
    };
  
    return PartnerKey;
  };
  