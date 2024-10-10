const express = require('express');
const router = express.Router();
const taskController = require('../controllers/taskController');

// Swagger documentation for getting all tasks
/**
 * @swagger
 * /tasks:
 *   get:
 *     summary: Get all tasks
 *     description: Retrieves all tasks in the system.
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
 *                     description: Unique identifier for the task
 *                   type:
 *                     type: string
 *                     description: Type of the task (e.g., 'service request')
 *                   status:
 *                     type: string
 *                     description: Status of the task (e.g., 'pending')
 *                   userId:
 *                     type: integer
 *                     description: ID of the user assigned to the task
 */

// GET route to retrieve all tasks
router.get('/', taskController.getAllTasks);

// Swagger documentation for getting tasks for a specific user
/**
 * @swagger
 * /tasks/user/{userId}:
 *   get:
 *     summary: Get tasks for a specific user
 *     description: Retrieves all tasks assigned to a specific user.
 *     tags: [Tasks]
 *     parameters:
 *       - in: path
 *         name: userId
 *         schema:
 *           type: integer
 *           example: 3
 *         required: true
 *         description: The ID of the user to fetch tasks for
 *     responses:
 *       200:
 *         description: A list of tasks for the user
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     description: Unique identifier for the task
 *                   type:
 *                     type: string
 *                     description: Type of the task (e.g., 'service request')
 *                   status:
 *                     type: string
 *                     description: Status of the task (e.g., 'pending')
 *                   userId:
 *                     type: integer
 *                     description: ID of the user assigned to the task
 */

// GET route to retrieve tasks for a specific user
router.get('/user/:userId', taskController.getTasksForUser);

module.exports = router;
