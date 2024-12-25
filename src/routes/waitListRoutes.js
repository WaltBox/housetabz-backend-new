const express = require('express');
const router = express.Router();
const waitListController = require('../controllers/waitListController');

/**
 * @swagger
 * components:
 *   schemas:
 *     WaitList:
 *       type: object
 *       required:
 *         - name
 *         - phone
 *         - email
 *         - city
 *       properties:
 *         id:
 *           type: integer
 *           description: Unique identifier for the waitlist entry
 *         name:
 *           type: string
 *           description: Full name of the person
 *         phone:
 *           type: string
 *           description: Phone number of the person
 *         email:
 *           type: string
 *           description: Email address of the person
 *         city:
 *           type: string
 *           description: City of the person
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the entry was created
 *         updatedAt:
 *           type: string
 *           format: date-time
 *           description: Timestamp when the entry was last updated
 */

/**
 * @swagger
 * tags:
 *   name: WaitList
 *   description: Waitlist management endpoints
 */

/**
 * @swagger
 * /waitlist:
 *   post:
 *     summary: Add a new entry to the waitlist
 *     tags: [WaitList]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/WaitList'
 *     responses:
 *       201:
 *         description: The waitlist entry was created successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WaitList'
 *       400:
 *         description: Bad Request - missing or invalid fields
 *       409:
 *         description: Conflict - email already exists
 */
router.post('/', waitListController.addToWaitList);

/**
 * @swagger
 * /waitlist:
 *   get:
 *     summary: Get all entries from the waitlist
 *     tags: [WaitList]
 *     responses:
 *       200:
 *         description: A list of waitlist entries
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 $ref: '#/components/schemas/WaitList'
 */
router.get('/', waitListController.getWaitList);

/**
 * @swagger
 * /waitlist/{id}:
 *   get:
 *     summary: Get a specific entry from the waitlist by ID
 *     tags: [WaitList]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: The ID of the waitlist entry
 *     responses:
 *       200:
 *         description: The waitlist entry data
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/WaitList'
 *       404:
 *         description: Waitlist entry not found
 */
router.get('/:id', waitListController.getWaitListEntryById);

module.exports = router;
