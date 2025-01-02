const { Partner, ServiceRequestBundle } = require('../models');
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

      const api_key = crypto.randomBytes(16).toString('hex');
      const secret_key = crypto.randomBytes(32).toString('hex');

      const partner = await Partner.create({
        name,
        about,
        important_information,
        logo,
        registration_code,
        person_of_contact,
        phone_number,
        email,
        api_key,
        secret_key,
      });

      res.status(201).json({
        message: 'Partner created successfully',
        partner: {
          id: partner.id,
          name: partner.name,
          api_key: partner.api_key,
          secret_key, // Show only once
        },
      });
    } catch (error) {
      console.error('Error creating partner:', error);
      res.status(500).json({ message: 'Failed to create partner' });
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
};

module.exports = partnerController;
