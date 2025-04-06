// src/controllers/billSubmissionController.js
const { BillSubmission, HouseService, User, Notification, Bill, sequelize } = require('../models');
const { Op } = require('sequelize');

const billSubmissionController = {
  // Get pending bill submissions for a user
  async getPendingSubmissionsForUser(req, res) {
    try {
      const { userId } = req.params;
      
      console.log(`[billSubmissionController] Fetching pending bill submissions for user: ${userId}`);
      
      const submissions = await BillSubmission.findAll({
        where: { 
          userId,
          status: 'pending'
        },
        include: [{ 
          model: HouseService, 
          as: 'houseService' 
        }],
        order: [['dueDate', 'ASC']]
      });
      
      console.log(`[billSubmissionController] Found ${submissions.length} pending submissions`);
      
      res.status(200).json({
        message: submissions.length ? 'Pending bill submissions found' : 'No pending bill submissions',
        submissions
      });
    } catch (error) {
      console.error('[billSubmissionController] Error fetching pending bill submissions:', error);
      res.status(500).json({ 
        error: 'Failed to fetch pending bill submissions',
        details: error.message
      });
    }
  },
  
  // Submit a bill amount for a variable service
  async submitBillAmount(req, res) {
    try {
      const { submissionId } = req.params;
      const { amount } = req.body;
      const userId = req.user.id; // Get the authenticated user's ID
      
      console.log(`[billSubmissionController] Submitting bill amount for submission: ${submissionId}, amount: ${amount}`);
      
      if (!amount) {
        console.log('[billSubmissionController] Missing amount in request body');
        return res.status(400).json({ error: 'Amount is required' });
      }
      
      // First check if the BillSubmission model exists and has records
      const count = await BillSubmission.count();
      console.log(`[billSubmissionController] Total BillSubmission records in database: ${count}`);
      
      const submission = await BillSubmission.findByPk(submissionId);
      
      if (!submission) {
        console.log(`[billSubmissionController] Bill submission with ID ${submissionId} not found`);
        return res.status(404).json({ error: 'Bill submission request not found' });
      }
      
      console.log(`[billSubmissionController] Found submission: ${JSON.stringify(submission.toJSON())}`);
      
      // Authorization check: Ensure the authenticated user matches the submission's user
      if (userId != submission.userId) {
        console.log(`[billSubmissionController] User ID mismatch: ${userId} vs ${submission.userId}`);
        return res.status(403).json({ error: 'Unauthorized to submit this bill' });
      }
      
      // Fetch the houseService separately to ensure it exists
      const houseService = await HouseService.findByPk(submission.houseServiceId);
      
      if (!houseService) {
        console.log(`[billSubmissionController] House service with ID ${submission.houseServiceId} not found`);
        return res.status(404).json({ error: 'Associated house service not found' });
      }
      
      console.log(`[billSubmissionController] Found house service: ${houseService.name}`);
      
      if (submission.status === 'completed') {
        console.log(`[billSubmissionController] Submission ${submissionId} is already completed`);
        return res.status(400).json({ error: 'This bill submission has already been completed' });
      }
      
      // Use billService directly instead of calling billController
      const billService = require('../services/billService');
      
      console.log('[billSubmissionController] Calling billService.createBillForVariableService');
      
      // Create a transaction for this operation
      const transaction = await sequelize.transaction();
      
      try {
        // Call the service method directly
        const result = await billService.createBillForVariableService(
          houseService,
          amount,
          submission.userId,
          transaction
        );
        
        // Update the submission with the bill info
        submission.amount = amount;
        submission.status = 'completed';
        if (result && result.bill && result.bill.id) {
          submission.billId = result.bill.id;
        }
        await submission.save({ transaction });
        
        // Commit the transaction
        await transaction.commit();
        
        console.log(`[billSubmissionController] Bill created: ${JSON.stringify(result.bill || {})}`);
        console.log(`[billSubmissionController] Submission updated to completed status`);
        
        res.status(200).json({
          message: 'Bill amount submitted successfully',
          billSubmission: submission,
          bill: result.bill || {},
          charges: result.charges || []
        });
      } catch (error) {
        // Rollback the transaction if there's an error
        await transaction.rollback();
        throw error;
      }
    } catch (error) {
      console.error('[billSubmissionController] Error submitting bill amount:', error);
      res.status(500).json({ 
        error: 'Failed to submit bill amount',
        details: error.message
      });
    }
  }
};

module.exports = billSubmissionController;