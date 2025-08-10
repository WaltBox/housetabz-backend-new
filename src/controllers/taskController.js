// src/controllers/taskController.js
const { Task, ServiceRequestBundle, StagedRequest, TakeOverRequest, Payment } = require('../models');
const stripeService = require('../services/StripeService');

const taskController = {
  async updateTask(req, res) {
    try {
      const { taskId } = req.params;
      const { response } = req.body;



      if (!['accepted', 'rejected'].includes(response)) {
        return res.status(400).json({ error: 'Invalid response value' });
      }

      // Include both stagedRequest and takeOverRequest associations
      const task = await Task.findByPk(taskId, {
        include: [{
          model: ServiceRequestBundle,
          as: 'serviceRequestBundle',
          include: [
            { model: StagedRequest, as: 'stagedRequest' },
            { model: TakeOverRequest, as: 'takeOverRequest' }
          ]
        }]
      });

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Validate that the authenticated user owns this task
      if (task.userId !== req.user.id) {
        return res.status(403).json({ error: 'Unauthorized - task belongs to different user' });
      }

      // Handle rejection: rejection completes the task regardless of payment
      if (response === 'rejected') {
        task.response = 'rejected';
        task.status = true;
        await task.save();

        return res.status(200).json({
          message: 'Task rejected successfully',
          task,
          requiresPayment: false
        });
      }

      // Handle acceptance
      if (response === 'accepted') {
        task.response = 'accepted';

        // If payment is required and not yet authorized, create payment intent for consent
        if (task.paymentRequired && task.paymentStatus === 'pending') {
          try {
            // Create payment intent for consent (authorize but don't capture)
            const paymentIntent = await stripeService.createPaymentIntentForConsent({
              amount: task.paymentAmount,
              userId: req.user.id, // Use authenticated user ID
              metadata: { 
                taskId: task.id,
                serviceRequestBundleId: task.serviceRequestBundleId,
                type: 'staged_request_consent'
              }
            }, `task-${task.id}-${Date.now()}`); // Simple idempotency key

            // Update task with authorization
            task.paymentStatus = 'authorized';
            task.stripePaymentIntentId = paymentIntent.id;
            task.status = true; // Task is complete - they consented
            await task.save();

            // Check if everyone has consented and trigger simultaneous capture if ready
            await taskController.checkAndCaptureAllPayments(task.serviceRequestBundleId);

            return res.status(200).json({
              message: 'Consent given - you will be charged when everyone accepts',
              task,
              paymentAuthorized: true,
              paymentIntentId: paymentIntent.id
            });
          } catch (stripeError) {
            console.error('Error creating payment intent for consent:', stripeError);
            return res.status(500).json({
              error: 'Failed to authorize payment',
              details: stripeError.message
            });
          }
        }

        // No payment required or payment already completed/authorized: mark task complete
        task.status = true;
        await task.save();

        // If no payment required, still check if bundle can be completed
        if (!task.paymentRequired) {
          await taskController.checkAndCaptureAllPayments(task.serviceRequestBundleId);
        }

        return res.status(200).json({
          message: 'Task accepted successfully',
          task,
          requiresPayment: false
        });
      }
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ 
        error: 'Failed to update task',
        details: error.message
      });
    }
  },

  async getTasksByUser(req, res) {
    try {
      const { userId } = req.params;
   
      
      const tasks = await Task.findAll({ 
        where: { userId },
        include: [{
          model: ServiceRequestBundle,
          as: 'serviceRequestBundle',
          include: [
            { model: StagedRequest, as: 'stagedRequest' },
            { model: TakeOverRequest, as: 'takeOverRequest' }
          ]
        }],
        order: [['createdAt', 'DESC']]
      });
    
      // Explicitly set the status code first, then send the response
      res.status(200);
      
      if (!tasks.length) {
      
      } else {
      }
      
      return res.json({
        message: tasks.length ? 'Tasks retrieved successfully' : 'No tasks found for this user',
        tasks: tasks || []
      });
      
    } catch (error) {
      console.error('Error fetching tasks for user:', error);
      return res.status(500).json({ error: 'Failed to fetch tasks for user' });
    }
  },

  async getTaskStatus(req, res) {
    try {
      const { taskId } = req.params;
      
      const task = await Task.findByPk(taskId, {
        include: [
          {
            model: ServiceRequestBundle,
            as: 'serviceRequestBundle',
            include: [
              { model: StagedRequest, as: 'stagedRequest' },
              { model: TakeOverRequest, as: 'takeOverRequest' }
            ]
          },
          {
            model: Payment,
            required: false,
            where: { status: 'completed' }
          }
        ]
      });

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const responseData = {
        task,
        status: {
          isComplete: task.status,
          response: task.response,
          requiresPayment: task.paymentRequired && task.paymentStatus !== 'completed',
          paymentStatus: task.paymentStatus,
          paymentAmount: task.paymentAmount
        }
      };

      res.status(200).json(responseData);
    } catch (error) {
      console.error('Error fetching task status:', error);
      res.status(500).json({ error: 'Failed to fetch task status' });
    }
  },

  async getTasks(req, res) {
    try {
      const tasks = await Task.findAll({
        include: [{
          model: ServiceRequestBundle,
          as: 'serviceRequestBundle',
          include: [
            { model: StagedRequest, as: 'stagedRequest' },
            { model: TakeOverRequest, as: 'takeOverRequest' }
          ]
        }],
        order: [['createdAt', 'DESC']]
      });

      res.status(200).json({
        message: 'Tasks retrieved successfully',
        tasks
      });
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  },

  /**
   * Checks if all roommates have consented (authorized) and captures all payments simultaneously
   * This is called after each user accepts to see if we're ready to charge everyone
   */
  async checkAndCaptureAllPayments(serviceRequestBundleId) {
    try {
      // Get the service request bundle with all tasks
      const bundle = await ServiceRequestBundle.findByPk(serviceRequestBundleId, {
        include: [
          {
            model: Task,
            as: 'tasks'
          },
          {
            model: StagedRequest,
            as: 'stagedRequest'
          }
        ]
      });

      if (!bundle) {
        console.error('Service request bundle not found:', serviceRequestBundleId);
        return;
      }

      // Check if all tasks are completed and accepted
      const allTasks = bundle.tasks;
      const allTasksComplete = allTasks.every(t => t.status === true);
      const allTasksAccepted = allTasks.every(t => t.response === 'accepted' || t.response === 'rejected');
      
      // Check if any task was rejected
      const anyTaskRejected = allTasks.some(t => t.response === 'rejected');

      if (anyTaskRejected) {
        console.log('Request rejected - cancelling all payment intents');
        await taskController.cancelAllPaymentIntents(serviceRequestBundleId);
        return;
      }

      if (!allTasksComplete || !allTasksAccepted) {
        console.log('Not all tasks are complete yet');
        return;
      }

      // Check payment requirements
      const paymentTasks = allTasks.filter(t => t.paymentRequired);
      
      if (paymentTasks.length === 0) {
        // No payments required - just update bundle status
        console.log('No payments required - updating bundle status to accepted');
        await bundle.update({ status: 'accepted' });
        if (bundle.stagedRequest) {
          await bundle.stagedRequest.update({ status: 'authorized' });
        }
        return;
      }

      // Check if all payment tasks are authorized
      const allPaymentsAuthorized = paymentTasks.every(t => 
        t.paymentStatus === 'authorized' && t.stripePaymentIntentId
      );

      if (allPaymentsAuthorized) {
        console.log('All payments authorized - capturing all payment intents simultaneously');
        
        // Capture all payment intents simultaneously
        const paymentIntentIds = paymentTasks.map(t => t.stripePaymentIntentId);
        
        try {
          await stripeService.captureMultiplePaymentIntents(paymentIntentIds);
          
          // Update all tasks to completed
          await Promise.all(paymentTasks.map(task => 
            task.update({ paymentStatus: 'completed' })
          ));

          // Update bundle status
          await bundle.update({ status: 'accepted' });
          if (bundle.stagedRequest) {
            await bundle.stagedRequest.update({ status: 'authorized' });
          }

          console.log('Successfully captured all payments and updated bundle status');
        } catch (captureError) {
          console.error('Error capturing payments:', captureError);
          // Handle capture failure - you might want to retry or alert admins
        }
      } else {
        console.log('Not all payments are authorized yet');
      }
    } catch (error) {
      console.error('Error checking and capturing payments:', error);
    }
  },

  /**
   * Cancels all payment intents for a service request bundle
   * Used when someone rejects the request
   */
  async cancelAllPaymentIntents(serviceRequestBundleId) {
    try {
      const bundle = await ServiceRequestBundle.findByPk(serviceRequestBundleId, {
        include: [
          {
            model: Task,
            as: 'tasks',
            where: { 
              paymentRequired: true,
              paymentStatus: 'authorized'
            },
            required: false
          }
        ]
      });

      if (!bundle || !bundle.tasks || bundle.tasks.length === 0) {
        console.log('No authorized payment intents to cancel');
        return;
      }

      const paymentIntentIds = bundle.tasks
        .filter(t => t.stripePaymentIntentId)
        .map(t => t.stripePaymentIntentId);

      if (paymentIntentIds.length > 0) {
        console.log(`Cancelling ${paymentIntentIds.length} payment intents`);
        
        const results = await stripeService.cancelMultiplePaymentIntents(paymentIntentIds);
        
        // Update task statuses to cancelled
        await Promise.all(bundle.tasks.map(task => 
          task.update({ paymentStatus: 'cancelled' })
        ));

        // Update bundle status
        await bundle.update({ status: 'rejected' });
        
        console.log(`Cancelled ${results.successful.length} payment intents, ${results.failed.length} failed`);
      }
    } catch (error) {
      console.error('Error cancelling payment intents:', error);
    }
  }
};

module.exports = taskController;
