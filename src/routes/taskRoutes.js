const express = require('express');
const taskController = require('../controllers/taskController');
const router = express.Router();
const { authenticateUser } = require('../middleware/auth/userAuth');
const { catchAsync } = require('../middleware/errorHandler');

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
router.get('/', authenticateUser, catchAsync(taskController.getTasks));


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
router.get('/user/:userId', authenticateUser, catchAsync(taskController.getTasksByUser));


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
router.get('/:taskId', authenticateUser, catchAsync(taskController.getTaskStatus));

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
router.patch('/:taskId', authenticateUser, catchAsync(taskController.updateTask));

module.exports = router;
