const { Task, ServiceRequestBundle, RhythmOfferRequest, SparklyRequest } = require('../models');
const { Op } = require('sequelize');

exports.getTasks = async (req, res) => {
  try {
    const tasks = await Task.findAll();
    res.status(200).json(tasks);
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
};

exports.getTasksForUser = async (req, res) => {
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
};

exports.updateTask = async (req, res) => {
  try {
    const { taskId } = req.params;
    const { response } = req.body;

    const task = await Task.findByPk(taskId);
    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    task.response = response;
    task.status = response === 'accepted';
    await task.save();

    const tasksInBundle = await Task.findAll({
      where: {
        serviceRequestBundleId: task.serviceRequestBundleId,
        status: false,
      },
    });

    if (tasksInBundle.length === 0) {
      const serviceRequestBundle = await ServiceRequestBundle.findByPk(
        task.serviceRequestBundleId
      );
      serviceRequestBundle.roommate_accepted = true;
      await serviceRequestBundle.save();

      // Update RhythmOfferRequest if it exists
      const rhythmOfferRequest = await RhythmOfferRequest.findOne({
        where: { service_request_bundle_id: serviceRequestBundle.id },
      });

      if (rhythmOfferRequest) {
        rhythmOfferRequest.roommate_accepted = true;
        await rhythmOfferRequest.save();
      }

      // Update SparklyRequest if it exists
      const sparklyRequest = await SparklyRequest.findOne({
        where: { service_request_bundle_id: serviceRequestBundle.id },
      });

      if (sparklyRequest) {
        sparklyRequest.roommate_accepted = true;
        await sparklyRequest.save();
      }
    }


    res.status(200).json(task);
  } catch (error) {
    console.error('Error updating task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
};
