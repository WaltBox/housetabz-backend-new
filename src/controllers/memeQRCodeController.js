// controllers/memeQRCodeController.js
const { MemeQRCode, WaitList, sequelize } = require('../models');

// Create a new meme QR code
exports.createMemeQRCode = async (req, res) => {
  try {
    const { city, memeId, memeDescription, location } = req.body;

    // Validate required fields
    if (!city || !memeId) {
      return res.status(400).json({ message: 'City and memeId are required.' });
    }

    // Base URL for your waitlist page
    const baseUrl = 'https://houseTabz.com/vip';
    
    // Create the QR code entry
    const memeQRCode = await MemeQRCode.create({
      city,
      memeId,
      memeDescription: memeDescription || `Meme ${memeId} for ${city}`,
      location,
      createdBy: req.user?.id // If you have user authentication
    });

    // Create the URL for the QR code
    const qrCodeUrl = `${baseUrl}?qrId=${memeQRCode.id}&city=${encodeURIComponent(city)}`;
    await memeQRCode.update({ qrCodeUrl });

    res.status(201).json({
      message: 'Meme QR code created successfully!',
      id: memeQRCode.id,
      memeId,
      city,
      url: qrCodeUrl
    });
  } catch (error) {
    console.error('Error creating meme QR code:', error);
    res.status(500).json({ 
      message: 'Server error. Please try again later.',
      details: error.message
    });
  }
};

// Get all meme QR codes
exports.getAllMemeQRCodes = async (req, res) => {
  try {
    const memeQRCodes = await MemeQRCode.findAll({
      order: [['createdAt', 'DESC']]
    });

    res.status(200).json(memeQRCodes);
  } catch (error) {
    console.error('Error retrieving meme QR codes:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// Get a specific meme QR code by ID
exports.getMemeQRCodeById = async (req, res) => {
  try {
    const { id } = req.params;
    const memeQRCode = await MemeQRCode.findByPk(id);

    if (!memeQRCode) {
      return res.status(404).json({ message: 'Meme QR code not found.' });
    }

    res.status(200).json(memeQRCode);
  } catch (error) {
    console.error('Error retrieving meme QR code:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

