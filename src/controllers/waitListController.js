// src/controllers/waitListController.js
const { WaitList, Referrer, MemeQRCode } = require('../models');
const { sendWelcomeEmail } = require('../services/emailService');

// Add a user to the waitlist
exports.addToWaitList = async (req, res) => {
  try {

    const { name, phone, email, city, referrerId, qrId } = req.body;

    // Validate required fields
    if (!name || !phone || !email || !city) {
   
      return res.status(400).json({ message: 'All fields are required.' });
    }

    // Create the waitlist entry with attribution to either referrer or meme QR code
    const waitListEntry = await WaitList.create({
      name,
      phone,
      email,
      city,
      referrerId: referrerId || null,
      memeQRCodeId: qrId || null
    });

  

    // Try to send welcome email but don't let it block the response
    try {
      await sendWelcomeEmail(name, email);
     
    } catch (emailError) {
      console.error('Failed to send welcome email:', emailError);
      // Continue even if email fails
    }

    res.status(201).json({
      message: 'Successfully added to the waitlist!',
      entry: waitListEntry
    });

  } catch (error) {
    // Log the full error details
    console.error('Error in addToWaitList:', {
      message: error.message,
      stack: error.stack,
      details: error
    });

    // Check for specific error types
    if (error.name === 'SequelizeUniqueConstraintError') {
      return res.status(409).json({ message: 'This email is already on the waitlist.' });
    }

    res.status(500).json({ 
      message: 'Server error. Please try again later.',
      details: error.message // Adding error details for debugging
    });
  }
};

// Get all waitlist entries (for admin use)
exports.getWaitList = async (req, res) => {
  try {
    const waitList = await WaitList.findAll({
      order: [['createdAt', 'DESC']],
      include: [
        { model: Referrer, as: 'referrer', attributes: ['id', 'name'] },
        { model: MemeQRCode, as: 'memeQRCode', attributes: ['id', 'city', 'memeId'] }
      ]
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
    const waitListEntry = await WaitList.findByPk(id, {
      include: [
        { model: Referrer, as: 'referrer', attributes: ['id', 'name'] },
        { model: MemeQRCode, as: 'memeQRCode', attributes: ['id', 'city', 'memeId'] }
      ]
    });

    if (!waitListEntry) {
      return res.status(404).json({ message: 'Waitlist entry not found.' });
    }

    res.status(200).json(waitListEntry);
  } catch (error) {
    console.error('Error retrieving specific waitlist entry:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};