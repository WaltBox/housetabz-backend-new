const { Op } = require('sequelize'); // Ensure this import

module.exports = (sequelize, DataTypes) => {
  const ServiceRequestBundle = sequelize.define('ServiceRequestBundle', {
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
    },
    houseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    roommate_accepted: {
      type: DataTypes.BOOLEAN,
      defaultValue: false,
    },
  });

  ServiceRequestBundle.associate = (models) => {
    ServiceRequestBundle.hasMany(models.ServiceRequest, { 
      foreignKey: 'serviceRequestBundleId', 
      as: 'requests' 
    });
    ServiceRequestBundle.belongsTo(models.House, { foreignKey: 'houseId' });
    ServiceRequestBundle.belongsTo(models.User, { foreignKey: 'userId', as: 'submitter' });
  };

  // After creating a ServiceRequestBundle, create ServiceRequests for each roommate
  ServiceRequestBundle.afterCreate(async (bundle, options) => {
    const { User } = sequelize.models;

    try {
      // Fetch all users in the same house, excluding the request creator
      const roommates = await User.findAll({
        where: {
          houseId: bundle.houseId,
          id: { [Op.ne]: bundle.userId },
        },
      });

      const serviceRequests = roommates.map((roommate) => ({
        userId: roommate.id,
        serviceRequestBundleId: bundle.id,
        accepted: false,
      }));

      await sequelize.models.ServiceRequest.bulkCreate(serviceRequests);
    } catch (error) {
      console.error('Error creating service requests:', error);
      throw error; // Throw the error to ensure it bubbles up if needed
    }
  });

  return ServiceRequestBundle;
};
