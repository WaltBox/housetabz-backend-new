const db = require('../models');
const Form = db.Form;
const Partner = db.Partner;
const Parameter = db.Parameter;

// Create a new form
exports.createForm = async (req, res) => {
    try {
      const { name } = req.body;
      const { partnerId } = req.params; // Extract partnerId from the route parameter
  
      // Ensure the form name is provided
      if (!name) {
        return res.status(400).json({ message: 'Form name is required' });
      }
  
      // Ensure the partner exists and is formable
      const partner = await Partner.findByPk(partnerId);
      if (!partner || partner.type !== 'formable') {
        return res.status(400).json({ message: 'Invalid partner or partner is not formable' });
      }
  
      // Create the form and associate it with the partner
      const form = await Form.create({ name, partnerId });
  
      // Update the partner's form field (optional)
      await partner.update({ form: true });
  
      res.status(201).json({ message: 'Form created successfully', form });
    } catch (error) {
      console.error('Error creating form:', error);
      res.status(500).json({ message: 'Failed to create form' });
    }
  };
  
  
  
  

// Get all forms for a partner
exports.getFormsByPartner = async (req, res) => {
  try {
    const { partnerId } = req.params;

    const forms = await Form.findAll({
      where: { partnerId },
      include: [{ model: Parameter, as: 'parameters' }],
    });

    res.status(200).json(forms);
  } catch (error) {
    console.error('Error fetching forms:', error);
    res.status(500).json({ message: 'Failed to fetch forms' });
  }
};

// Delete a form
exports.deleteForm = async (req, res) => {
  try {
    const { id } = req.params;

    const form = await Form.findByPk(id);
    if (!form) {
      return res.status(404).json({ message: 'Form not found' });
    }

    await form.destroy();
    res.status(200).json({ message: 'Form deleted successfully' });
  } catch (error) {
    console.error('Error deleting form:', error);
    res.status(500).json({ message: 'Failed to delete form' });
  }
};

// Get forms and parameters for a partner
exports.getFormsWithParameters = async (req, res) => {
    const { partnerId } = req.params;
  
    try {
      const forms = await Form.findAll({
        where: { partnerId },
        include: [{ model: Parameter, as: 'parameters' }],
      });
  
      // Always return an array, even if empty
      res.status(200).json(forms);
    } catch (error) {
      console.error('Error fetching forms with parameters:', error);
      res.status(500).json({ error: 'Failed to fetch forms with parameters.' });
    }
  };