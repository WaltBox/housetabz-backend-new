// models/rhythmOffers.js
module.exports = (sequelize, DataTypes) => {
    const RhythmOffers = sequelize.define('RhythmOffers', {
      uuid: {
        type: DataTypes.UUID,
        primaryKey: true,
      },
      title: DataTypes.STRING,
      url: DataTypes.STRING,
      term_months: DataTypes.INTEGER,
      price_1000_kwh: DataTypes.STRING,
      renewable_energy: DataTypes.BOOLEAN,
      zip_codes: DataTypes.ARRAY(DataTypes.STRING),
    }, {
      tableName: 'rhythm_offers',
      timestamps: false, // Since we're pulling data from rhythm_test_api, timestamps are unnecessary
    });
  
    return RhythmOffers;
  };
  