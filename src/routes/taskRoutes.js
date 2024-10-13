const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController'); // Ensure correct path

// Swagger documentation for getting all tasks
/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks
 *     tags: [Tasks]
 *     responses:
 *       200:
 *         description: A list of tasks
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                   type:
 *                     type: string
 *                   status:
 *                     type: boolean
 *                   userId:
 *                     type: integer
 */
router.get('/', taskController.getTasks); // Check this function

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
router.get('/user/:userId', taskController.getTasksForUser); // Check this function

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
router.patch('/:taskId', taskController.updateTask); // Check this function

module.exports = router;
