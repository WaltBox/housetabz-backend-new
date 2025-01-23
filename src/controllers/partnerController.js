const { Partner, ServiceRequestBundle, PartnerKey } = require('../models');
const crypto = require('crypto');
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');

const partnerController = {
  // Create a new partner
  
  async createPartner(req, res) {
    try {
      const { name, registration_code } = req.body;
  
      if (!name || !registration_code) {
        return res.status(400).json({ message: 'Name and Registration Code are required.' });
      }
  
      // Create the Partner
      const partner = await Partner.create({ name, registration_code });
  
      // Generate API and Secret Keys with Prefixes
      const apiKey = `whec-${crypto.randomBytes(16).toString('hex')}`;
      const secretKey = `htzs-${crypto.randomBytes(32).toString('hex')}`;
  
      // Save the keys to the PartnerKeys table
      await PartnerKey.create({
        partnerId: partner.id,
        api_key: apiKey,
        secret_key: secretKey,
      });
  
      res.status(201).json({
        message: 'Partner created successfully',
        partner: {
          id: partner.id,
          name: partner.name,
          registration_code: partner.registration_code,
          api_key: apiKey, // Return the API key for admin visibility
          secret_key: secretKey, // Return the Secret key for admin visibility
        },
      });
    } catch (error) {
      console.error('Error in createPartner:', error);
      res.status(500).json({ message: 'Failed to create partner.' });
    }
  },  

  // Complete Registration
  async completeRegistration(req, res) {
    try {
      const { partnerId } = req.params;
      const { person_of_contact, email, password, phone_number } = req.body;
  
      // Validate input
      if (!person_of_contact || !email || !password || !phone_number) {
        return res.status(400).json({ error: 'All fields are required.' });
      }
  
      // Find the partner by ID
      const partner = await Partner.findOne({ where: { id: partnerId } });
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found.' });
      }
  
      // Update partner details
      partner.set({
        person_of_contact,
        email,
        password, // Plain text password is set; the `beforeSave` hook will hash it
        phone_number,
      });
  
      await partner.save(); // Triggers the `beforeSave` hook for hashing
  
      res.status(200).json({
        message: 'Partner registration completed successfully.',
        partner: {
          id: partner.id,
          name: partner.name,
          person_of_contact: partner.person_of_contact,
          email: partner.email,
          phone_number: partner.phone_number,
        },
      });
    } catch (error) {
      console.error('Error in completeRegistration:', error.message);
      res.status(500).json({ error: 'Failed to complete registration.' });
    }
  },
  


  // Verify Partner
  async verifyPartner(req, res) {
    try {
      const { name, registration_code } = req.body;

      if (!name || !registration_code) {
        return res.status(400).json({ error: 'Both name and registration code are required.' });
      }

      const partner = await Partner.findOne({
        where: { name, registration_code },
        attributes: ['id', 'name', 'registration_code'], // Minimal fields for verification
      });

      if (!partner) {
        return res.status(404).json({ error: 'Invalid name or registration code.' });
      }

      res.status(200).json({ partner });
    } catch (error) {
      console.error('Error verifying partner:', error.message);
      res.status(500).json({ error: 'Failed to verify partner.' });
    }
  },

  // Login
  async login(req, res) {
    try {
      const { email, password } = req.body;
  
      if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required.' });
      }
  
      const partner = await Partner.findOne({ where: { email } });
      if (!partner) {
        return res.status(404).json({ error: 'Invalid email or password.' });
      }
  
      // Compare hashed password
      const isMatch = await bcrypt.compare(password, partner.password);
      if (!isMatch) {
        return res.status(401).json({ error: 'Invalid email or password.' });
      }
  
      const token = jwt.sign(
        { id: partner.id, email: partner.email },
        process.env.JWT_SECRET,
        { expiresIn: '1h' }
      );
  
      res.status(200).json({ token, message: 'Login successful' });
    } catch (error) {
      console.error('Error during login:', error.message);
      res.status(500).json({ error: 'Failed to log in.' });
    }
  },
  

  async getCurrentPartner(req, res) {
    try {
      const partner = req.current_partner; // Middleware already set this
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }
  
      res.json({ partner });
    } catch (error) {
      console.error('Error in getCurrentPartner:', error);
      res.status(500).json({ error: 'Failed to fetch partner data' });
    }
  },

  // Retrieve API keys for a partner
async getApiKeys(req, res) {
  try {
    const { partnerId } = req.params; // Extract the partner ID from the route params

    // Query the database for API keys associated with this partner
    const apiKeys = await PartnerKey.findAll({
      where: { partnerId },
      attributes: ['id', 'api_key', 'secret_key'], // Fetch only the necessary fields
    });

    if (!apiKeys || apiKeys.length === 0) {
      return res.status(404).json({ error: 'No API keys found for this partner' });
    }

    res.status(200).json({ apiKeys });
  } catch (error) {
    console.error('Error fetching API keys:', error);
    res.status(500).json({ error: 'Failed to fetch API keys' });
  }
},

  // Logout
  logout(req, res) {
    try {
      res.status(200).json({ message: 'Logout successful. Please clear your token on the client side.' });
    } catch (error) {
      console.error('Error during logout:', error);
      res.status(500).json({ error: 'Failed to log out.' });
    }
  },
  // Get all partners
  async getAllPartners(req, res) {
    try {
      const partners = await Partner.findAll({
        attributes: ['id', 'name', 'logo', 'about', 'email', 'phone_number'],
      });

      res.status(200).json({ partners });
    } catch (error) {
      console.error('Error fetching partners:', error);
      res.status(500).json({ error: 'Failed to fetch partners' });
    }
  },

  // Get a specific partner by ID
  async getPartnerById(req, res) {
    const { partnerId } = req.params;
    console.log('Fetching partner with ID:', partnerId); // Add this
    if (!partnerId) {
        return res.status(400).json({ error: 'Partner ID is required' });
    }
    try {
        const partner = await Partner.findOne({ where: { id: partnerId } });
        if (!partner) {
            return res.status(404).json({ error: 'Partner not found' });
        }
        res.status(200).json({ partner });
    } catch (error) {
        console.error('Error fetching partner:', error);
        res.status(500).json({ error: 'Failed to fetch partner' });
    }
},

  

  // Stage authorization
  async stageAuthorization(req, res) {
    try {
      const { houseId, userId, transactionId, serviceName, pricing } = req.body;

      if (!houseId || !userId || !transactionId || !serviceName || !pricing) {
        return res.status(400).json({ error: 'Missing required fields' });
      }

      const serviceRequestBundle = await ServiceRequestBundle.create({
        houseId,
        userId,
        status: 'pending',
        transactionId,
      });

      res.status(201).json({
        message: 'Authorization staged successfully',
        serviceRequestBundle,
      });
    } catch (error) {
      console.error('Error staging authorization:', error);
      res.status(500).json({ error: 'Failed to stage authorization' });
    }
  },

  // Retrieve API keys for a partner
  async getApiKeys(req, res) {
    try {
      const { partnerId } = req.params;

      const apiKeys = await PartnerKey.findAll({
        where: { partnerId },
        attributes: ['id', 'api_key', 'secret_key'],
      });

      if (!apiKeys || apiKeys.length === 0) {
        return res.status(404).json({ error: 'No API keys found for this partner' });
      }

      res.status(200).json({ apiKeys });
    } catch (error) {
      console.error('Error fetching API keys:', error);
      res.status(500).json({ error: 'Failed to fetch API keys' });
    }
  },
};

module.exports = partnerController;
