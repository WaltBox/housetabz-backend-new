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
        console.log('Payment validation failed:', validationError);
        return res.status(400).json({
          status: 'error',
          code: 'VALIDATION_ERROR',
          message: validationError.error,
          details: validationError
        });
      }

      // Get and validate task
      const task = await Task.findByPk(taskId);
      console.log('Found task:', task ? task.toJSON() : null);
      
      const taskError = await validateTask(task, userId, amount);
      if (taskError) {
        console.log('Task validation failed:', taskError);
        return res.status(taskError.status).json({
          status: 'error',
          code: 'TASK_VALIDATION_ERROR',
          message: taskError.message,
          details: taskError
        });
      }

      // Check for existing payment
      const existingPayment = await checkExistingPayment(taskId, userId);
      if (existingPayment) {
        console.log('Duplicate payment attempt:', existingPayment.toJSON());
        return res.status(400).json({
          status: 'error',
          code: 'DUPLICATE_PAYMENT',
          message: 'Payment already processed for this task',
          details: { existingPaymentId: existingPayment.id }
        });
      }

      // Process payment and update records
      const result = await processPaymentTransaction(task, userId, amount);
      console.log('Payment processed successfully:', result);

      res.status(200).json({
        status: 'success',
        message: 'Payment processed successfully',
        data: result
      });

    } catch (error) {
      console.error('Payment processing failed:', error);
      res.status(500).json({
        status: 'error',
        code: 'PAYMENT_PROCESSING_ERROR',
        message: 'Failed to process payment',
        details: {
          error: error.message,
          stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
        }
      });
    }
  },

  async getPaymentStatus(req, res) {
    try {
      const { taskId } = req.params;
      console.log('Getting payment status for task:', taskId);

      const payment = await Payment.findOne({
        where: { taskId },
        include: [{
          model: Task,
          as: 'task',
          include: [{
            model: ServiceRequestBundle,
            as: 'serviceRequestBundle'
          }]
        }]
      });

      if (!payment) {
        return res.status(404).json({
          status: 'error',
          code: 'PAYMENT_NOT_FOUND',
          message: 'Payment not found'
        });
      }

      res.status(200).json({
        status: 'success',
        data: {
          payment,
          status: payment.status,
          amount: payment.amount,
          paymentDate: payment.paymentDate,
          taskStatus: payment.task?.status
        }
      });

    } catch (error) {
      console.error('Error fetching payment status:', error);
      res.status(500).json({
        status: 'error',
        code: 'PAYMENT_STATUS_ERROR',
        message: 'Failed to fetch payment status',
        details: error.message
      });
    }
  }
};

function validatePaymentRequest(taskId, userId, amount) {
  console.log('Validating payment request:', { taskId, userId, amount });
  
  if (!taskId) {
    return { error: 'taskId is required', field: 'taskId' };
  }
  if (!userId) {
    return { error: 'userId is required', field: 'userId' };
  }
  if (!amount) {
    return { error: 'amount is required', field: 'amount' };
  }
  if (isNaN(parseFloat(amount))) {
    return { error: 'Invalid amount format', field: 'amount', value: amount };
  }
  return null;
}

async function validateTask(task, userId, amount) {
  if (!task) {
    return { status: 404, message: 'Task not found', code: 'TASK_NOT_FOUND' };
  }

  if (task.userId !== userId) {
    return { 
      status: 403, 
      message: 'Task does not belong to this user',
      code: 'UNAUTHORIZED_ACCESS',
      details: { taskUserId: task.userId, requestUserId: userId }
    };
  }

  if (!task.paymentRequired) {
    return { 
      status: 400, 
      message: 'This task does not require payment',
      code: 'PAYMENT_NOT_REQUIRED'
    };
  }

  const expectedAmount = parseFloat(task.paymentAmount);
  const providedAmount = parseFloat(amount);

  if (expectedAmount !== providedAmount) {
    return {
      status: 400,
      message: 'Invalid payment amount',
      code: 'INVALID_AMOUNT',
      details: {
        expected: expectedAmount,
        received: providedAmount,
        difference: Math.abs(expectedAmount - providedAmount).toFixed(2)
      }
    };
  }

  return null;
}

async function checkExistingPayment(taskId, userId) {
  return await Payment.findOne({
    where: {
      taskId,
      userId,
      status: 'completed'
    }
  });
}

async function updateServiceBundle(bundle, amount) {
    try {
      // Convert both values to numbers with 2 decimal places
      const currentTotal = Number(bundle.totalPaidUpfront || 0).toFixed(2);
      const newAmount = Number(amount).toFixed(2);
      
      console.log('Before calculation:', {
        currentTotal: currentTotal,
        newAmount: newAmount,
        currentTotalType: typeof currentTotal,
        newAmountType: typeof newAmount
      });
  
      // Convert back to numbers for the addition
      const sum = Number(currentTotal) + Number(newAmount);
      
      console.log('After calculation:', {
        sum: sum,
        sumType: typeof sum
      });
  
      // Ensure the final result is properly formatted
      const newTotal = Number(sum).toFixed(2);
      
      console.log('Final total:', {
        newTotal: newTotal,
        newTotalType: typeof newTotal
      });
  
      // Update the bundle
      bundle.totalPaidUpfront = newTotal;
      await bundle.save();
      await bundle.updateStatusIfAllTasksCompleted();
  
    } catch (error) {
      console.error('Bundle update failed:', {
        error: error.message,
        bundleId: bundle.id,
        currentTotal: bundle.totalPaidUpfront,
        attemptedAmount: amount
      });
      throw error;
    }
  }
async function processPaymentTransaction(task, userId, amount) {
  try {
    console.log('Starting payment transaction:', { taskId: task.id, userId, amount });
    
    const payment = await Payment.create({
      taskId: task.id,
      userId,
      amount: parseFloat(amount).toFixed(2),
      status: 'completed',
      paymentDate: new Date(),
      transactionId: `TEST-${Date.now()}`
    });

    console.log('Payment record created:', payment.toJSON());

    task.paymentStatus = 'completed';
    task.paymentTransactionId = payment.transactionId;
    await task.save();
    console.log('Task updated with payment info');

    if (task.serviceRequestBundleId) {
      const bundle = await ServiceRequestBundle.findByPk(task.serviceRequestBundleId);
      if (bundle) {
        await updateServiceBundle(bundle, amount);
        console.log('Service bundle updated');
      }
    }

    return { payment, task };
  } catch (error) {
    console.error('Payment transaction failed:', error);
    throw new Error(`Payment transaction failed: ${error.message}`);
  }
}

module.exports = paymentController;