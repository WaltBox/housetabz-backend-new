// src/controllers/taskController.js
const { Task, ServiceRequestBundle, StagedRequest, Payment } = require('../models');

const taskController = {
  async updateTask(req, res) {
    try {
      const { taskId } = req.params;
      const { response } = req.body;

      console.log('Updating task:', { taskId, response });

      if (!['accepted', 'rejected'].includes(response)) {
        return res.status(400).json({ error: 'Invalid response value' });
      }

      const task = await Task.findByPk(taskId, {
        include: [{
          model: ServiceRequestBundle,
          as: 'serviceRequestBundle',
          include: [{
            model: StagedRequest,
            as: 'stagedRequest'
          }]
        }]
      });

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      console.log('Current task state:', {
        taskId: task.id,
        currentStatus: task.status,
        currentResponse: task.response,
        paymentRequired: task.paymentRequired,
        paymentStatus: task.paymentStatus
      });

      // Handle response update
      if (response === 'rejected') {
        // Rejection completes the task regardless of payment
        task.response = 'rejected';
        task.status = true; // Task is complete when rejected
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

        // Check if payment is required and not yet completed
        if (task.paymentRequired && task.paymentStatus !== 'completed') {
          // Save response but don't mark as complete
          await task.save();
          
          return res.status(200).json({
            message: 'Payment required to complete task acceptance',
            requiresPayment: true,
            paymentAmount: task.paymentAmount,
            task
          });
        }

        // No payment required or payment already completed
        task.status = true;
        await task.save();

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
          include: [{
            model: StagedRequest,
            as: 'stagedRequest'
          }]
        }],
        order: [['createdAt', 'DESC']]
      });

      if (!tasks.length) {
        return res.status(404).json({ 
          message: 'No tasks found for this user',
          tasks: []
        });
      }

      res.status(200).json({
        message: 'Tasks retrieved successfully',
        tasks
      });
    } catch (error) {
      console.error('Error fetching tasks for user:', error);
      res.status(500).json({ error: 'Failed to fetch tasks for user' });
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
            include: [{
              model: StagedRequest,
              as: 'stagedRequest'
            }]
          },
          {
            model: Payment,
            required: false,
            where: {
              status: 'completed'
            }
          }
        ]
      });

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      const response = {
        task,
        status: {
          isComplete: task.status,
          response: task.response,
          requiresPayment: task.paymentRequired && task.paymentStatus !== 'completed',
          paymentStatus: task.paymentStatus,
          paymentAmount: task.paymentAmount
        }
      };

      res.status(200).json(response);
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
          include: [{
            model: StagedRequest,
            as: 'stagedRequest'
          }]
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
  }
};

module.exports = taskController;