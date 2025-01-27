module.exports = (sequelize, DataTypes) => {
  const ServiceRequestBundle = sequelize.define('ServiceRequestBundle', {
    houseId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    userId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    stagedRequestId: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    status: {
      type: DataTypes.STRING,
      allowNull: false,
      defaultValue: 'pending',
    },
  });

  ServiceRequestBundle.associate = (models) => {
    ServiceRequestBundle.belongsTo(models.StagedRequest, {
      foreignKey: 'stagedRequestId',
      as: 'stagedRequest',
    });

    ServiceRequestBundle.hasMany(models.Task, {
      foreignKey: 'serviceRequestBundleId',
      as: 'tasks',
    });
  };

  ServiceRequestBundle.prototype.updateStatusIfAllTasksAccepted = async function () {
    try {
      const tasks = await sequelize.models.Task.findAll({
        where: { serviceRequestBundleId: this.id },
      });

      const allAccepted = tasks.every((task) => task.status === true);

      if (allAccepted && this.status !== 'accepted') {
        this.status = 'accepted';
        await this.save();
      }
    } catch (error) {
      console.error('Error checking/updating bundle status:', error);
    }
  };

  ServiceRequestBundle.addHook('afterUpdate', async (bundle) => {
    if (bundle.status === 'accepted') {
      const { StagedRequest } = sequelize.models;
      try {
        const stagedRequest = await StagedRequest.findByPk(bundle.stagedRequestId);
        if (stagedRequest) {
          stagedRequest.status = 'authorized';
          await stagedRequest.save();
        }
      } catch (error) {
        console.error('Error updating staged request status:', error);
      }
    }
  });

  return ServiceRequestBundle;
};
