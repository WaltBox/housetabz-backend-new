module.exports = (sequelize, DataTypes) => {
    const RhythmOfferRequest = sequelize.define(
      'RhythmOfferRequest',
      {
        id: {
          type: DataTypes.INTEGER,
          autoIncrement: true,
          primaryKey: true,
        },
        uuid: {
          type: DataTypes.UUID,
          defaultValue: DataTypes.UUIDV4,
          unique: true,
        },
        url: DataTypes.STRING,
        term_months: DataTypes.INTEGER,
        title: DataTypes.STRING,
        rhythm_kwh_rate: DataTypes.STRING,
        tdsp_kwh_rate: DataTypes.STRING,
        tdsp_customer_charge_amount: DataTypes.STRING,
        description_en: DataTypes.TEXT,
        description_es: DataTypes.TEXT,
        long_description_en: DataTypes.TEXT,
        long_description_es: DataTypes.TEXT,
        price_2000_kwh: DataTypes.STRING,
        price_1000_kwh: DataTypes.STRING,
        price_500_kwh: DataTypes.STRING,
        rhythm_efl_en: DataTypes.STRING,
        rhythm_efl_es: DataTypes.STRING,
        rhythm_tos_en: DataTypes.STRING,
        rhythm_tos_es: DataTypes.STRING,
        rhythm_yrac_en: DataTypes.STRING,
        rhythm_yrac_es: DataTypes.STRING,
        utility_name: DataTypes.STRING,
        utility_id: DataTypes.STRING,
        utility_charges: DataTypes.STRING,
        renewable_energy: DataTypes.BOOLEAN,
        base_charge_amount: DataTypes.STRING,
        earliest_service_start_date: DataTypes.DATE,
        early_termination_fee_amount: DataTypes.STRING,
        grace_period_days: DataTypes.INTEGER,
        rhythm_charge_breakdown: DataTypes.JSON,
        zip_codes: {
          type: DataTypes.ARRAY(DataTypes.STRING),
          allowNull: false,
          defaultValue: [],
        },
        house_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        user_id: {
          type: DataTypes.INTEGER,
          allowNull: false,
        },
        security_deposit: DataTypes.INTEGER,
        security_deposit_paid: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        roommate_accepted: {
          type: DataTypes.BOOLEAN,
          defaultValue: false,
        },
        service_start_date: {
          type: DataTypes.DATE,
          allowNull: true,
        },
        enrollment_type: {
          type: DataTypes.ENUM('MOVE_IN', 'SWITCH'),
          allowNull: false,
          defaultValue: 'MOVE_IN',
        },
        meter_id: {
          type: DataTypes.STRING,
          allowNull: true,
        },
      },
      {
        tableName: 'rhythm_offer_requests',
        timestamps: true, // Adds createdAt and updatedAt
      }
    );
  
    return RhythmOfferRequest;
  };
  