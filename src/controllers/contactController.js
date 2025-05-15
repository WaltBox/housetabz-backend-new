// controllers/contactController.js
const { Contact } = require('../models');
const { sendContactConfirmationEmail } = require('../services/emailService');

// Add a new contact form entry
exports.addContact = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const contactEntry = await Contact.create({ name, email, message });

    // Send confirmation email to the user using AWS SES
    await sendContactConfirmationEmail(name, email);

    res.status(201).json({ message: 'Message sent successfully!', entry: contactEntry });
  } catch (error) {
    console.error('Error adding contact message:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// Get all contact form entries (for admin use)
exports.getAllContacts = async (req, res) => {
  try {
    const contacts = await Contact.findAll({ order: [['createdAt', 'DESC']] });
    res.status(200).json(contacts);
  } catch (error) {
    console.error('Error retrieving contacts:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};