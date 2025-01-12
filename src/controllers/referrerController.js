const { Referrer } = require('../models');

exports.generateReferralLink = async (req, res) => {
  try {
    const { name, email } = req.body;

    if (!name || !email) {
      return res.status(400).json({ message: 'Name and email are required.' });
    }

    // Check if email already exists
    const existingReferrer = await Referrer.findOne({ where: { email } });
    if (existingReferrer) {
      // Format the preview URL using the existing referrer ID
      const previewUrl = `/referral-program/r/${existingReferrer.id}`;
      return res.status(409).json({
        message: 'You already have a referral link.',
        link: previewUrl,
      });
    }
    
    // Create the referrer
    const referrer = await Referrer.create({
      name,
      email,
      referralLink: `/vip?referrerId=${referrer.id}` // Store the actual redirect URL
    });

    // Format the preview URL for sharing
    const previewUrl = `/referral-program/r/${referrer.id}`;

    res.status(201).json({
      message: 'Referral link created successfully!',
      link: previewUrl,
    });
  } catch (error) {
    console.error('Error generating referral link:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};

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

    // Return the preview URL instead of direct link
    const previewUrl = `${process.env.BASE_URL || 'https://housetabz.com'}/referral-program/r/${referrer.id}`;

    res.status(200).json({
      message: 'Referral link retrieved successfully!',
      link: previewUrl,
    });
  } catch (error) {
    console.error('Error retrieving referral link:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};