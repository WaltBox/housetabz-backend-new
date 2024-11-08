// models/houseService.js
module.exports = (sequelize, DataTypes) => {
    const HouseService = sequelize.define('HouseService', {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      status: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'pending',
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      houseId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
      // Polymorphic association fields
      association_id: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      association_type: {
        type: DataTypes.STRING,
        allowNull: true,
      },
    });
  
    HouseService.associate = (models) => {
      HouseService.belongsTo(models.House, { foreignKey: 'houseId' });
  
      // Setup polymorphic association
      HouseService.belongsTo(models.RhythmOfferRequest, {
        foreignKey: 'association_id',
        constraints: false,
        scope: {
          association_type: 'RhythmOfferRequest',
        },
      });
  
       // New association: HouseService has many Bills
    HouseService.hasMany(models.Bill, { foreignKey: 'houseService_id', as: 'bills' });
};
    
  
    return HouseService;
  };
  