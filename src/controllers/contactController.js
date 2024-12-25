const { Contact } = require('../models');
const sgMail = require('@sendgrid/mail');

sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Add a new contact form entry
exports.addContact = async (req, res) => {
  try {
    const { name, email, message } = req.body;

    if (!name || !email || !message) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    const contactEntry = await Contact.create({ name, email, message });

    // Send confirmation email to the user
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; padding: 20px; background-color: #dff6f0; color: #333;">
        <h1 style="color: #34d399;">Thank You for Reaching Out!</h1>
        <p>Hi ${name},</p>
        <p>Thank you for contacting HouseTabz. Our team will review your message and get back to you as soon as possible.</p>
        <p style="margin-top: 20px;">Best regards,</p>
        <p>HouseTabz Team</p>
      </div>
    `;

    await sgMail.send({
      to: email,
      from: 'support@housetabz.com',
      subject: 'We Received Your Message!',
      html: emailHtml,
    });

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
