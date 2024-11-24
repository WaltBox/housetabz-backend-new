module.exports = (sequelize, DataTypes) => {
    const Parameter = sequelize.define('Parameter', {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      choices: {
        type: DataTypes.TEXT, // Supports longer strings like dropdown choices
        allowNull: true, // Optional for non-dropdown types
      },
      priceEffect: {
        type: DataTypes.INTEGER,
        allowNull: true,
      },
      formId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    });
  
    Parameter.associate = (models) => {
      Parameter.belongsTo(models.Form, { foreignKey: 'formId' });
    };
  
    return Parameter;
  };
  