const { Partner, ServiceRequestBundle, PartnerKey } = require('../models');
const crypto = require('crypto');
const axios = require('axios');

const partnerController = {
  // Create a new partner
  async createPartner(req, res) {
    try {
      const {
        name,
        about,
        important_information,
        logo,
        registration_code,
        person_of_contact,
        phone_number,
        email,
      } = req.body;

      if (!name || !registration_code) {
        return res.status(400).json({ message: 'Name and Registration Code are required.' });
      }

      const partner = await Partner.create({
        name,
        about,
        important_information,
        logo,
        registration_code,
        person_of_contact,
        phone_number,
        email,
      });

      res.status(201).json({
        message: 'Partner created successfully',
        partner: {
          id: partner.id,
          name: partner.name,
        },
      });
    } catch (error) {
      console.error('Error creating partner:', error);
      res.status(500).json({ message: 'Failed to create partner' });
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
    try {
      const { id } = req.params;

      const partner = await Partner.findOne({
        where: { id },
        attributes: [
          'id',
          'name',
          'logo',
          'about',
          'important_information',
          'registration_code',
          'person_of_contact',
          'email',
          'phone_number',
        ],
      });

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
