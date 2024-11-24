const db = require('../models');
const Parameter = db.Parameter;
const Form = db.Form;

exports.addParameter = async (req, res) => {
    try {
      let { name, type, choices, priceEffect, formId } = req.body;
  
      console.log('Received parameter data:', req.body); // Debugging
  
      // Map 'select' to 'dropdown'
      if (type === 'select') {
        type = 'dropdown';
      }
  
      if (!name || !type || !formId) {
        return res.status(400).json({ message: 'Name, type, and formId are required.' });
      }
  
      if (type === 'dropdown' && (!choices || choices.trim() === '')) {
        return res.status(400).json({ message: 'Choices are required for dropdown type.' });
      }
  
      const parameter = await Parameter.create({
        name,
        type,
        choices: type === 'dropdown' ? choices : null,
        priceEffect: priceEffect || null,
        formId,
      });
  
      res.status(201).json({ message: 'Parameter added successfully', parameter });
    } catch (error) {
      console.error('Error adding parameter:', error);
      res.status(500).json({ message: 'Failed to add parameter.' });
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
