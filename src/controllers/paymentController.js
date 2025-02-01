// src/controllers/paymentController.js
const { Payment, Task, ServiceRequestBundle } = require('../models');

const paymentController = {
  async processPayment(req, res) {
    try {
      console.log('Received payment request:', req.body);
      const { taskId, userId, amount } = req.body;
      
      // Validate request payload
      const validationError = validatePaymentRequest(taskId, userId, amount);
      if (validationError) {
        return res.status(400).json(validationError);
      }

      // Get and validate task
      const task = await Task.findByPk(taskId);
      console.log('Found task:', task); 

      const taskError = await validateTask(task, userId, amount);
      if (taskError) {
        return res.status(taskError.status).json({ error: taskError.message });
      }

      // Check for existing payment
      const existingPayment = await Payment.findOne({
        where: {
          taskId,
          userId,
          status: 'completed'
        }
      });

      if (existingPayment) {
        return res.status(400).json({ error: 'Payment already processed for this task' });
      }

      // Create payment record
      const payment = await Payment.create({
        taskId,
        userId,
        amount: parseFloat(amount).toFixed(2),
        status: 'completed',
        paymentDate: new Date(),
        transactionId: `TEST-${Date.now()}`
      });

      // Update task status and payment info
      task.paymentStatus = 'completed';
      task.paymentTransactionId = payment.transactionId;
      
      // If task is accepted and payment is completed, set status to true
      if (task.response === 'accepted') {
        task.status = true;
      }
      
      await task.save();

      console.log('Updated task:', {
        taskId: task.id,
        status: task.status,
        response: task.response,
        paymentStatus: task.paymentStatus
      });

      res.status(200).json({
        message: 'Payment processed successfully',
        payment,
        task
      });

    } catch (error) {
      console.error('Error processing payment:', error);
      res.status(500).json({ 
        error: 'Failed to process payment',
        details: error.message 
      });
    }
  },

  async getPaymentStatus(req, res) {
    try {
      const { taskId } = req.params;
      
      const payment = await Payment.findOne({
        where: { taskId },
        include: [{
          model: Task,
          as: 'task'
        }]
      });

      if (!payment) {
        return res.status(404).json({ error: 'Payment not found' });
      }

      res.status(200).json({ payment });
    } catch (error) {
      console.error('Error fetching payment status:', error);
      res.status(500).json({ error: 'Failed to fetch payment status' });
    }
  }
};

// Helper Functions
function validatePaymentRequest(taskId, userId, amount) {
  if (!taskId) return { error: 'taskId is required' };
  if (!userId) return { error: 'userId is required' };
  if (!amount) return { error: 'amount is required' };
  if (isNaN(parseFloat(amount))) return { error: 'Invalid amount format' };
  return null;
}

async function validateTask(task, userId, amount) {
  if (!task) {
    return { status: 404, message: 'Task not found' };
  }

  if (task.userId !== userId) {
    return { status: 403, message: 'Task does not belong to this user' };
  }

  if (!task.paymentRequired) {
    return { status: 400, message: 'This task does not require payment' };
  }

  if (parseFloat(task.paymentAmount) !== parseFloat(amount)) {
    return {
      status: 400,
      message: 'Invalid payment amount',
      expected: parseFloat(task.paymentAmount),
      received: parseFloat(amount)
    };
  }

  return null;
}

module.exports = paymentController;