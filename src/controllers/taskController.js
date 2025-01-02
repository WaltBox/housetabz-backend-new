const { Task, ServiceRequestBundle } = require('../models');
const Sequelize = require('sequelize');

const taskController = {
  async getTasks(req, res) {
    try {
      const tasks = await Task.findAll();
      res.status(200).json(tasks);
    } catch (error) {
      console.error('Error fetching tasks:', error);
      res.status(500).json({ error: 'Failed to fetch tasks' });
    }
  },

  async getTasksByUser(req, res) {
    try {
      const { userId } = req.params;
      const tasks = await Task.findAll({ where: { userId } });

      if (!tasks.length) {
        return res.status(404).json({ error: 'No tasks found for this user' });
      }

      res.status(200).json(tasks);
    } catch (error) {
      console.error('Error fetching tasks for user:', error);
      res.status(500).json({ error: 'Failed to fetch tasks for user' });
    }
  },

  async updateTask(req, res) {
    try {
      const { taskId } = req.params;
      const { response } = req.body;

      // Validate response
      if (!['accepted', 'rejected'].includes(response)) {
        return res.status(400).json({ error: 'Invalid response value. Must be "accepted" or "rejected".' });
      }

      // Find the task
      const task = await Task.findByPk(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      // Update the task status and response
      task.response = response;
      task.status = response === 'accepted';
      await task.save();

      // Check if all tasks associated with the same ServiceRequestBundle are complete
      if (task.status) {
        const associatedTasks = await Task.findAll({
          where: {
            serviceRequestBundleId: task.serviceRequestBundleId,
          },
        });

        const allTasksCompleted = associatedTasks.every((t) => t.status === true);

        if (allTasksCompleted) {
          // Update the ServiceRequestBundle status to "accepted"
          const serviceRequestBundle = await ServiceRequestBundle.findByPk(task.serviceRequestBundleId);
          if (serviceRequestBundle) {
            serviceRequestBundle.status = 'accepted';
            await serviceRequestBundle.save();
          }
        }
      }

      res.status(200).json({
        message: 'Task updated successfully',
        task,
      });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  },
};

module.exports = taskController;
