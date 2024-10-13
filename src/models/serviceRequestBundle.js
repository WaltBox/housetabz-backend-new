const { Op } = require('sequelize'); // Import Sequelize Op

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

  // Associations
  ServiceRequestBundle.associate = (models) => {
    ServiceRequestBundle.hasMany(models.Task, { 
      foreignKey: 'serviceRequestBundleId', 
      as: 'tasks' 
    });

    ServiceRequestBundle.belongsTo(models.House, { foreignKey: 'houseId' });
    ServiceRequestBundle.belongsTo(models.User, { 
      foreignKey: 'userId', 
      as: 'submitter' 
    });
  };

  // Hook: After creating a ServiceRequestBundle, create Tasks for each roommate
  ServiceRequestBundle.afterCreate(async (bundle, options) => {
    const { User, Task } = sequelize.models;

    try {
      // Fetch all users in the same house, excluding the request creator
      const roommates = await User.findAll({
        where: {
          houseId: bundle.houseId,
          id: { [Op.ne]: bundle.userId }, // Exclude the user who created the bundle
        },
      });

      // Prepare tasks for each roommate
      const tasks = roommates.map((roommate) => ({
        userId: roommate.id,
        serviceRequestBundleId: bundle.id,
        type: 'service request',
        status: false, // Not accepted initially
        response: null, // No response yet (can be 'accepted' or 'rejected')
      }));

      // Bulk create tasks
      await Task.bulkCreate(tasks);
    } catch (error) {
      console.error('Error creating tasks:', error);
      throw error; // Ensure the error bubbles up
    }
  });

  return ServiceRequestBundle;
};
