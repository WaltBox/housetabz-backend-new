// models/form.js
module.exports = (sequelize, DataTypes) => {
    const Form = sequelize.define('Form', {
      name: {
        type: DataTypes.STRING,
        allowNull: false,
      },
      partnerId: {
        type: DataTypes.INTEGER,
        allowNull: false,
      },
    });
  
    Form.associate = (models) => {
      Form.belongsTo(models.Partner, { foreignKey: 'partnerId', as: 'partner' });
      Form.hasMany(models.Parameter, { foreignKey: 'formId', as: 'parameters' });
    };
  
    return Form;
  };
  