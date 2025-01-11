const { WaitList } = require('../models');
const sgMail = require('@sendgrid/mail');
const { createWelcomeEmail } = require('../utils/emailTemplates'); // Import the template

// Set the SendGrid API key
sgMail.setApiKey(process.env.SENDGRID_API_KEY);

// Function to send a welcome email
const sendWelcomeEmail = async (recipientName, recipientEmail) => {
  const emailHtml = createWelcomeEmail(recipientName);

  const msg = {
    to: recipientEmail,
    from: 'notifications@housetabz.com', // Your verified sender email
    subject: 'Welcome to HouseTabz!',
    html: emailHtml,
  };

  try {
    await sgMail.send(msg);
    console.log(`Welcome email sent to ${recipientEmail}`);
  } catch (error) {
    console.error(`Failed to send email to ${recipientEmail}:`, error.message);
    throw new Error('Failed to send welcome email.');
  }
};

// Add a user to the waitlist
exports.addToWaitList = async (req, res) => {
  try {
    const { name, phone, email, city } = req.body;
    const referrerId = req.query.ref; // Capture the referral ID from the query string

    if (!name || !phone || !email || !city) {
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Check if the email already exists
    const existingUser = await WaitList.findOne({ where: { email } });
    if (existingUser) {
      return res.status(409).json({ message: 'This email is already on the waitlist.' });
    }

    // Validate the referral ID (if provided)
    const referrer = referrerId ? await Referrer.findByPk(referrerId) : null;

    // Create the waitlist entry
    const waitListEntry = await WaitList.create({
      name,
      phone,
      email,
      city,
      referrerId: referrer ? referrer.id : null,
    });

    res.status(201).json({
      message: 'Successfully added to the waitlist!',
      entry: waitListEntry,
    });
  } catch (error) {
    console.error('Error adding to waitlist:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};


// Get all waitlist entries (for admin use)
exports.getWaitList = async (req, res) => {
  try {
    const waitList = await WaitList.findAll({
      order: [['createdAt', 'DESC']],
    });
    res.status(200).json(waitList);
  } catch (error) {
    console.error('Error retrieving waitlist:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// Get a specific waitlist entry by ID
exports.getWaitListEntryById = async (req, res) => {
  try {
    const { id } = req.params;
    const waitListEntry = await WaitList.findByPk(id);

    if (!waitListEntry) {
      return res.status(404).json({ message: 'Waitlist entry not found.' });
    }

    res.status(200).json(waitListEntry);
  } catch (error) {
    console.error('Error retrieving specific waitlist entry:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};
