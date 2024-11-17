// models/parameter.js
module.exports = (sequelize, DataTypes) => {
    const Parameter = sequelize.define('Parameter', {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      type: {
        type: DataTypes.ENUM('text', 'number', 'select'),
        allowNull: false,
      },
      choices: {
        type: DataTypes.STRING, // Comma-separated values for dropdown
        allowNull: true,
      },
      priceEffect: {
        type: DataTypes.DECIMAL,
        allowNull: true,
      },
      formId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    });
  
    Parameter.associate = (models) => {
      Parameter.belongsTo(models.Form, { foreignKey: 'formId', as: 'form' });
    };
  
    return Parameter;
  };
  