const { Task, ServiceRequestBundle } = require('../models');

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

      if (!['accepted', 'rejected'].includes(response)) {
        return res.status(400).json({ error: 'Invalid response value. Must be "accepted" or "rejected".' });
      }

      const task = await Task.findByPk(taskId);
      if (!task) {
        return res.status(404).json({ error: 'Task not found' });
      }

      task.response = response;
      task.status = response === 'accepted';
      await task.save();

      if (task.status) {
        const bundle = await ServiceRequestBundle.findByPk(task.serviceRequestBundleId);

        if (bundle) {
          await bundle.updateStatusIfAllTasksAccepted();
        }
      }

      res.status(200).json({ message: 'Task updated successfully', task });
    } catch (error) {
      console.error('Error updating task:', error);
      res.status(500).json({ error: 'Failed to update task' });
    }
  },
};

module.exports = taskController;
