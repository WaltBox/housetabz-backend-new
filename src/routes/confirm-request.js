// routes/confirm-request.js
const express = require('express');
const router = express.Router();
const confirmRequestController = require('../controllers/confirmRequestController');

// GET the confirmation page which shows service details and confirm button
router.get('/', async (req, res) => {
 try {
   // Get parameters from URL that SDK sent
   const {
     serviceName,
     serviceType,
     amount, 
     upfront,
     transactionId,
     apiKey
   } = req.query;

   // For now just render with the data
   res.render('confirm-request', {
     serviceName,
     serviceType,
     amount: parseFloat(amount),
     upfront: parseFloat(upfront) || 0,
     transactionId,
     apiKey
   });

 } catch (error) {
   console.error('Error loading confirm page:', error);
   res.status(500).send('Error loading confirmation page');
 }
});

// POST endpoint for when user clicks confirm
router.post('/confirm', async (req, res) => {
 try {
   const {
     serviceName,
     serviceType, 
     amount,
     upfront,
     transactionId,
     apiKey
   } = req.body;

   // Here we'll create the staged request
   // For now just send success
   res.json({ success: true });

 } catch (error) {
   console.error('Error creating staged request:', error);
   res.status(500).json({ error: 'Failed to create staged request' });
 }
});

module.exports = router;