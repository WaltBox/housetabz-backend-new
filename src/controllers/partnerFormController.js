const { PartnerForm } = require('../models');

// Add a new partner form entry
exports.addPartnerForm = async (req, res) => {
  try {
    const { businessName, contactName, phoneNumber, email } = req.body;

    if (!businessName || !contactName || !phoneNumber || !email) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const partnerFormEntry = await PartnerForm.create({
      businessName,
      contactName,
      phoneNumber,
      email,
    });

    res.status(201).json({
      message: 'Partner form submitted successfully!',
      entry: partnerFormEntry,
    });
  } catch (error) {
    console.error('Error adding partner form entry:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// Get all partner form entries (for admin use)
exports.getPartnerForms = async (req, res) => {
  try {
    const partnerForms = await PartnerForm.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json(partnerForms);
  } catch (error) {
    console.error('Error retrieving partner forms:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// Get a specific partner form entry by ID
exports.getPartnerFormById = async (req, res) => {
  try {
    const { id } = req.params;
    const partnerFormEntry = await PartnerForm.findByPk(id);

    if (!partnerFormEntry) {
      return res.status(404).json({ message: 'Partner form entry not found.' });
    }

    res.status(200).json(partnerFormEntry);
  } catch (error) {
    console.error('Error retrieving specific partner form entry:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};