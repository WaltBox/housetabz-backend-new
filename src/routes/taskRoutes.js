const express = require('express');
const taskController = require('../controllers/taskController'); // Correct path to the taskController
const router = express.Router();

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
router.get('/', taskController.getTasks);

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
router.get('/user/:userId', taskController.getTasksByUser);

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
router.patch('/:taskId', taskController.updateTask);

module.exports = router;
