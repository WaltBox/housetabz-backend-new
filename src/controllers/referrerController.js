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
      return res.status(409).json({
        message: 'You already have a referral link.',
        link: existingReferrer.referralLink,
      });
    }

    const baseUrl = 'https://houseTabz.com/vip';
    
    // First create the referrer
    const referrer = await Referrer.create({
      name,
      email
    });

    // Then update with the referral link
    const referralLink = `${baseUrl}?referrerId=${referrer.id}`;
    await referrer.update({ referralLink });

    res.status(201).json({
      message: 'Referral link created successfully!',
      link: referralLink,
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

    res.status(200).json({
      message: 'Referral link retrieved successfully!',
      link: referrer.referralLink,
    });
  } catch (error) {
    console.error('Error retrieving referral link:', error);
    res.status(500).json({ message: 'Server error. Please try again later.' });
  }
};