// models/memeQRCode.js
module.exports = (sequelize, DataTypes) => {
    const MemeQRCode = sequelize.define('MemeQRCode', {
      id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      memeId: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      memeDescription: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      location: {
        type: DataTypes.STRING,
        allowNull: true,
        comment: 'Specific location where QR code was placed'
      },
      qrCodeUrl: {
        type: DataTypes.STRING,
        allowNull: true,
        unique: true,
      },
      createdBy: {
        type: DataTypes.UUID,
        allowNull: true,
        comment: 'User who created this QR code'
      }
    });
  
    MemeQRCode.associate = (models) => {
      MemeQRCode.hasMany(models.WaitList, { foreignKey: 'memeQRCodeId', as: 'signups' });
    };
  
    return MemeQRCode;
  };