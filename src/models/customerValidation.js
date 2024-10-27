const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const CustomerValidation = sequelize.define(
    'CustomerValidation',
    {
      id: {
        type: DataTypes.INTEGER,
        autoIncrement: true,
        primaryKey: true,
      },
      uuid: {
        type: DataTypes.UUID,
        allowNull: false,
        unique: true,
      },
      deposit_amount: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      first_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      last_name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      email: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { isEmail: true },
      },
      phone: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      address_line: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      secondary_line: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      city: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      state: {
        type: DataTypes.STRING,
        allowNull: false,
        validate: { len: [2, 2] },
      },
      zip_code: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      acquisition_medium: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      acquisition_campaign: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      rhythm_campaign_slug: {
        type: DataTypes.STRING,
        allowNull: true,
      },
      rhythm_offer_request_id: {
        type: DataTypes.INTEGER,
        allowNull: false,
        references: {
          model: 'rhythm_offer_requests',
          key: 'id',
        },
      },
    },
    {
      tableName: 'customer_validations',
      timestamps: true,
    }
  );

    // Define the association
    CustomerValidation.associate = (models) => {
      CustomerValidation.belongsTo(models.RhythmOfferRequest, {
        foreignKey: 'rhythm_offer_request_id',
        as: 'rhythmOfferRequest',
      });
    };

  return CustomerValidation;
};
