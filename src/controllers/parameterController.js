const db = require('../models');
const Parameter = db.Parameter;
const Form = db.Form;

// Add a new parameter to a form
exports.addParameter = async (req, res) => {
  try {
    const { name, type, choices, priceEffect, formId } = req.body;

    // Ensure the form exists
    const form = await Form.findByPk(formId);
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    // Create the parameter
    const parameter = await Parameter.create({ name, type, choices, priceEffect, formId });
    res.status(201).json({ message: 'Parameter added successfully', parameter });
  } catch (error) {
    console.error('Error adding parameter:', error);
    res.status(500).json({ message: 'Failed to add parameter' });
  }
};

// Delete a parameter
exports.deleteParameter = async (req, res) => {
  try {
    const { id } = req.params;

    const parameter = await Parameter.findByPk(id);
    if (!parameter) {
      return res.status(404).json({ message: 'Parameter not found' });
    }

    await parameter.destroy();
    res.status(200).json({ message: 'Parameter deleted successfully' });
  } catch (error) {
    console.error('Error deleting parameter:', error);
    res.status(500).json({ message: 'Failed to delete parameter' });
  }
};
