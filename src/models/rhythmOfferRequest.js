const RhythmOfferRequest = sequelize.define('RhythmOfferRequest', {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    house_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false, // User who made the request
    },
    accepted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false, // Will change to true if all roommates accept
    },
    uuid: DataTypes.UUID, // Rhythm API offer snapshot UUID
    title: DataTypes.STRING,
    term_months: DataTypes.INTEGER,
    rhythm_kwh_rate: DataTypes.STRING,
    tdsp_kwh_rate: DataTypes.STRING,
    tdsp_customer_charge_amount: DataTypes.STRING,
    description_en: DataTypes.STRING,
    price_1000_kwh: DataTypes.STRING,
    zip_codes: DataTypes.ARRAY(DataTypes.STRING),
    created_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
    updated_at: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
    },
  });
  