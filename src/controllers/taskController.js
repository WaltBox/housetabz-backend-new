// src/controllers/taskController.js
const { Task, ServiceRequestBundle, StagedRequest, Payment } = require('../models');

const taskController = {
  // Get all tasks
  async getTasks(req, res) {
    try {
      const tasks = await Task.findAll();
      res.status(200).json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  },

  // Get tasks by user ID
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
        }]
      });

      if (!tasks.length) {
        return res.status(404).json({ error: 'No tasks found for this user' });
      }

      res.status(200).json(tasks);
    } catch (error) {
      console.error('Error fetching tasks for user:', error);
      res.status(500).json({ error: 'Failed to fetch tasks for user' });
    }
  },

  // Get task status including payment info
  async getTaskStatus(req, res) {
    try {
      const { taskId } = req.params;
      
      const task = await Task.findByPk(taskId, {
        include: [{
          model: Payment,
          required: false,
          where: {
            status: 'completed'
          }
        }]
      });

      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      res.status(200).json({
        task,
        requiresPayment: task.paymentRequired && task.paymentStatus !== 'completed',
        paymentComplete: task.paymentStatus === 'completed'
      });

    } catch (error) {
      console.error('Error fetching task status:', error);
      res.status(500).json({ error: 'Failed to fetch task status' });
    }
  },

  // Update task
  async updateTask(req, res) {
    try {
      const { taskId } = req.params;
      const { response } = req.body;

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

      // If the response is 'accepted', check payment requirements
      if (response === 'accepted') {
        // Check if payment is required and not already completed
        if (task.paymentRequired && task.paymentStatus !== 'completed') {
          // Update task response but don't mark as completed until payment
          task.response = response;
          await task.save();
          
          return res.status(200).json({
            message: 'Payment required before task can be completed',
            requiresPayment: true,
            paymentAmount: task.paymentAmount,
            task
          });
        }

        // If payment is not required or already completed, proceed with acceptance
        task.response = response;
        task.status = true;

        if (task.paymentRequired) {
          // Double check payment exists
          const payment = await Payment.findOne({
            where: {
              taskId: task.id,
              status: 'completed'
            }
          });

          if (!payment) {
            return res.status(400).json({
              error: 'Payment verification failed'
            });
          }
        }
      } else {
        // For rejected tasks, simply update the status
        task.response = response;
        task.status = false;
      }

      await task.save();

      // Only trigger bundle status update if task is accepted and payment requirements are met
      if (task.status) {
        const bundle = task.serviceRequestBundle;
        if (bundle) {
          await bundle.updateStatusIfAllTasksCompleted();
        }
      }

      res.status(200).json({
        message: 'Task updated successfully',
        task,
        requiresPayment: false
      });

    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  }
};

module.exports = taskController;