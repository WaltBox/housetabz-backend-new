const express = require('express');
const taskController = require('../controllers/taskController');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth/userAuth');
const { authenticateSystem } = require('../middleware/auth/systemAuth');
const { catchAsync } = require('../middleware/errorHandler');

// Middleware to allow either user or system authentication
const authenticateUserOrSystem = (req, res, next) => {
  // Check for system API key first
  const key = req.headers['x-housetabz-service-key'];
  if (key === process.env.SYSTEM_API_KEY) {
    return next(); // System key is valid, proceed
  }
  
  // If no valid system key, try user authentication
  authenticateUser(req, res, next);
};

/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: A list of tasks
 */
router.get('/', authenticateUserOrSystem, catchAsync(taskController.getTasks));

/**
 * @swagger
 * /tasks/user/{userId}:
 *   get:
 *     summary: Get tasks for a specific user
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: userId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: A list of tasks for the user
 */
router.get('/user/:userId', authenticateUserOrSystem, catchAsync(taskController.getTasksByUser));

/**
 * @swagger
 * /tasks/{taskId}:
 *   get:
 *     summary: Get task status including payment info
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 */
router.get('/:taskId', authenticateUserOrSystem, catchAsync(taskController.getTaskStatus));

/**
 * @swagger
 * /tasks/{taskId}:
 *   patch:
 *     summary: Update a task's response
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: taskId
 *         required: true
 *         schema:
 *           type: integer
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               response:
 *                 type: string
 *                 enum: [accepted, rejected]
 *     responses:
 *       200:
 *         description: Task updated successfully
 */
router.patch('/:taskId', authenticateUserOrSystem, catchAsync(taskController.updateTask));

module.exports = router;