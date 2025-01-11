const { Referrer } = require('../models');

// Generate referral link
exports.generateReferralLink = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }

    // Check if email already exists
    const existingReferrer = await Referrer.findOne({ where: { email } });
    if (existingReferrer) {
      return res.status(409).json({
        message: 'You already have a referral link.',
        link: existingReferrer.referralLink,
      });
    }

    // Generate unique referral link
    const baseUrl = 'https://houseTabz.com/vip';
    const referrer = await Referrer.create({
      name,
      email,
      referralLink: `${baseUrl}?ref=${await Referrer.count() + 1}`, // Simple ID-based referral link
    });

    res.status(201).json({
      message: 'Referral link created successfully!',
      link: referrer.referralLink,
    });
  } catch (error) {
    console.error('Error generating referral link:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

// Get referral link by email
exports.getReferralLinkByEmail = async (req, res) => {
  try {
    const { email } = req.query;

    if (!email) {
      return res.status(400).json({ message: 'Email is required.' });
    }

    const referrer = await Referrer.findOne({ where: { email } });

    if (!referrer) {
      return res.status(404).json({ message: 'Referrer not found.' });
    }

    res.status(200).json({
      message: 'Referral link retrieved successfully!',
      link: referrer.referralLink,
    });
  } catch (error) {
    console.error('Error retrieving referral link:', error.message);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};
