// src/controllers/taskController.js
const { Task, ServiceRequestBundle, StagedRequest, TakeOverRequest, Payment } = require('../models');

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

        // If payment is required and not yet completed, save response but don't mark task complete
        if (task.paymentRequired && task.paymentStatus !== 'completed') {
          await task.save();
          return res.status(200).json({
            message: 'Payment required to complete task acceptance',
            requiresPayment: true,
            paymentAmount: task.paymentAmount,
            task
          });
        }

        // No payment required or payment already completed: mark task complete
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
  }
};

module.exports = taskController;
