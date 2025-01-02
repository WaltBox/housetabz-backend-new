module.exports = (sequelize, DataTypes) => {
  const ServiceRequestBundle = sequelize.define('ServiceRequestBundle', {
    houseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false, // User who created the bundle
    },
    stagedRequestId: {
      type: DataTypes.INTEGER,
      allowNull: false, // Link to the associated StagedRequest
    },
    status: {
      type: DataTypes.STRING, // 'pending', 'accepted', 'declined'
      allowNull: false,
      defaultValue: 'pending',
    },
  });

  ServiceRequestBundle.associate = (models) => {
    ServiceRequestBundle.belongsTo(models.StagedRequest, {
      foreignKey: 'stagedRequestId',
      as: 'stagedRequest',
    });
  };

  // Hook to update the StagedRequest status
  ServiceRequestBundle.afterUpdate(async (bundle, options) => {
    if (bundle.status === 'accepted') {
      const { StagedRequest } = sequelize.models;
      try {
        // Update the associated StagedRequest
        await StagedRequest.update(
          { status: 'accepted' },
          { where: { id: bundle.stagedRequestId } }
        );
      } catch (error) {
        console.error('Error updating StagedRequest status:', error);
        throw error;
      }
    }
  });

  return ServiceRequestBundle;
};
