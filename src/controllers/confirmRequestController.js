// controllers/confirmRequestController.js
const Partner = require('../models/partner');
const ServiceRequestBundle = require('../models/serviceRequestBundle');



const confirmRequestController = {
  getConfirmPage: async (req, res) => {
    try {
      const {
        serviceName,
        serviceType,
        amount,
        upfront,
        transactionId,
        apiKey
      } = req.query;

      // For now just send basic HTML to confirm it works
      res.send(`
        <h1>Confirm Service Request</h1>
        <p>Service: ${serviceName}</p>
        <p>Amount: $${amount}</p>
      `);

    } catch (error) {
      console.error('Error:', error);
      res.status(500).send('Error loading page');
    }
  }
};

module.exports = confirmRequestController;
 // POST: Create staged request
 createStagedRequest: async (req, res) => {
   try {
     const {
       serviceName,
       serviceType,
       amount,
       upfront,
       transactionId,
       apiKey
     } = req.body;

     // Validate partner
     const partner = await Partner.findOne({
       where: { apiKey }
     });

     if (!partner) {
       return res.status(401).json({ error: 'Invalid API key' });
     }

     // Create service request bundle
     const bundle = await ServiceRequestBundle.create({
       partnerId: partner.id,
       serviceName,
       serviceType,
       estimatedAmount: parseFloat(amount),
       requiredUpfrontPayment: parseFloat(upfront) || 0,
       transactionId,
       status: 'pending'
     });

     res.status(201).json({ 
       success: true,
       bundleId: bundle.id
     });

   } catch (error) {
     console.error('Error creating staged request:', error);
     res.status(500).json({ error: 'Failed to create staged request' });
   }
};

module.exports = confirmRequestController;