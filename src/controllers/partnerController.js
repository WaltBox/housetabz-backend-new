const { Partner, ServiceRequestBundle, PartnerKey, WebhookLog } = require('../models');
const crypto = require('crypto');
const axios = require('axios');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const S3Service = require('../services/S3Service');
const generateWebhookSecret = () => {
  return `whsec_${crypto.randomBytes(32).toString('hex')}`;  // Added prefix for clarity
};

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
          api_key: apiKey,
          secret_key: secretKey,
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

      if (!person_of_contact || !email || !password || !phone_number) {
        return res.status(400).json({ error: 'All fields are required.' });
      }

      const partner = await Partner.findOne({ where: { id: partnerId } });
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found.' });
      }

      partner.set({
        person_of_contact,
        email,
        password,
        phone_number,
      });

      await partner.save();

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
        attributes: ['id', 'name', 'registration_code'],
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
      const partnerId = req.current_partner.id;
      console.log('Current Partner ID:', partnerId);
      
      // First get the partner
      const partner = await Partner.findByPk(partnerId);
      
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }
  
      // Separately get webhook logs
      const webhookLogs = await WebhookLog.findAll({
        where: { partner_id: partnerId },
        attributes: [
          'id',
          'eventType',
          'status',
          'statusCode',
          'payload',
          'response',
          'error',
          'createdAt'
        ],
        order: [['createdAt', 'DESC']],
        limit: 20
      });
  
      console.log('Found webhook logs:', webhookLogs.length);
  
      // Calculate webhook stats
      const webhookStats = {
        totalRequests: webhookLogs.length,
        successRate: webhookLogs.length ? 
          `${((webhookLogs.filter(log => log.status === 'success').length / webhookLogs.length) * 100).toFixed(1)}%` 
          : '0%',
        errorRate: webhookLogs.length ? 
          `${((webhookLogs.filter(log => log.status === 'failed').length / webhookLogs.length) * 100).toFixed(1)}%` 
          : '0%'
      };
  
      // Prepare response data
      const responseData = {
        ...partner.toJSON(),
        webhookLogs,
        webhookStats,
        housesUsingService: 0,
        totalRevenue: "$0",
        activeServices: 0,
        paymentsReceived: [],
        newAccounts: []
      };
  
      console.log('Sending response with webhook logs count:', webhookLogs.length);
  
      res.json({ partner: responseData });
    } catch (error) {
      console.error('Error in getCurrentPartner:', error);
      res.status(500).json({ error: 'Failed to fetch partner data' });
    }
  },

  async getCurrentPartnerWebhookLogs(req, res) {
    try {
      const partnerId = req.current_partner?.id;

      if (!partnerId) {
        return res.status(401).json({ error: 'Unauthorized. Partner not found.' });
      }

      const webhookLogs = await WebhookLog.findAll({
        where: { partner_id: partnerId },
        order: [['created_at', 'DESC']], // Sort by the latest logs
      });

      res.status(200).json({ webhookLogs });
    } catch (error) {
      console.error('Error fetching webhook logs for current partner:', error.message);
      res.status(500).json({ error: 'Failed to fetch webhook logs.' });
    }
  },

  async getWebhookLogById(req, res) {
    try {
      const { id } = req.params;

      const webhookLog = await WebhookLog.findOne({ where: { id } });

      if (!webhookLog) {
        return res.status(404).json({ error: 'Webhook log not found.' });
      }

      res.status(200).json({ webhookLog });
    } catch (error) {
      console.error('Error fetching webhook log by ID:', error.message);
      res.status(500).json({ error: 'Failed to fetch webhook log.' });
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
        serviceName,
        pricing, // Optional: Add pricing to the serviceRequestBundle if necessary
      });
  
      // Return a meaningful response
      res.status(201).json({
        message: 'Service request staged successfully!',
        serviceRequestBundle,
      });
    } catch (error) {
      console.error('Error staging authorization:', error);
      res.status(500).json({ error: 'Failed to stage authorization.' });
    }
  },

  

  async updateWebhookConfig(req, res) {
    try {
      const partner = req.webhookPartner; // Middleware should set this
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }
  
      const { webhookUrl } = req.body;
      if (!webhookUrl) {
        return res.status(400).json({ error: 'Webhook URL is required' });
      }
  
      // Generate secret and enable webhooks
      const webhookSecret = generateWebhookSecret();
  
      await partner.update({
        webhookUrl,
        webhookSecret,
        webhookEnabled: true,
      });
  
      res.status(200).json({
        message: 'Webhook configured successfully',
        webhookUrl: partner.webhookUrl,
        webhookSecret: partner.webhookSecret,
        webhookEnabled: partner.webhookEnabled,
      });
    } catch (error) {
      console.error('Error updating webhook config:', error);
      res.status(500).json({ error: 'Failed to update webhook configuration' });
    }
  },
  

  async getWebhookConfig(req, res) {
    try {
      if (!req.webhookPartner) {
        return res.status(401).json({ error: 'Partner not found' });
      }
  
      res.status(200).json({
        webhookUrl: req.webhookPartner.webhookUrl,
        webhookSecret: req.webhookPartner.webhookSecret,
        webhookEnabled: req.webhookPartner.webhookEnabled
      });
    } catch (error) {
      console.error('Error fetching webhook config:', error);
      res.status(500).json({ error: 'Failed to fetch webhook configuration' });
    }
  },

  async updateMarketplaceSettings(req, res) {
    try {
      const partnerId = req.current_partner.id;
      const partner = await Partner.findByPk(partnerId);
      
      if (!partner) {
        return res.status(404).json({ error: 'Partner not found' });
      }
  
      // Update text fields
      if (req.body.about) {
        partner.about = req.body.about;
      }
  
      // Handle file uploads
      const fileTypes = ['logo', 'marketplace_cover', 'company_cover'];
      
      for (const fileType of fileTypes) {
        if (req.files && req.files[fileType]) {
          const file = req.files[fileType][0];
          
          // Delete old file if exists
          if (partner[`${fileType}_key`]) {
            await S3Service.deleteFile(partner[`${fileType}_key`]);
          }
          
          // Upload new file
          const { url, key } = await S3Service.uploadFile(file, 'partner-images');
          
          // Update database
          partner[fileType] = url;
          partner[`${fileType}_key`] = key;
        }
      }
  
      await partner.save();
      
      res.json({ 
        message: 'Marketplace settings updated successfully',
        partner: {
          about: partner.about,
          logo: partner.logo,
          marketplace_cover: partner.marketplace_cover,
          company_cover: partner.company_cover
        }
      });
    } catch (error) {
      console.error('Update marketplace settings error:', error);
      res.status(500).json({ error: 'Failed to update marketplace settings' });
    }
  }
};

module.exports = partnerController;