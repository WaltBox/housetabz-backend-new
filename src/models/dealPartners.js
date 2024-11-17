module.exports = (sequelize) => {
    const DealPartner = sequelize.define('DealPartner', {}, { timestamps: false });
  
    return DealPartner;
  };
  