// src/routes/houseRoutes.js
const express = require('express');
const router = express.Router();
const houseController = require('../controllers/houseController');

/**
 * @swagger
 * tags:
 *   name: Houses
 *   description: API for managing houses
 */

/**
 * @swagger
 * /houses:
 *   post:
 *     summary: Create a new house
 *     tags: [Houses]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "House Alpha"
 *               address:
 *                 type: string
 *                 example: "123 Main St"
 *     responses:
 *       201:
 *         description: House created successfully
 *       400:
 *         description: Bad request
 */
router.post('/', houseController.createHouse);

/**
 * @swagger
 * /houses:
 *   get:
 *     summary: Get all houses
 *     tags: [Houses]
 *     responses:
 *       200:
 *         description: List of all houses
 *         content:
 *           application/json:
 *             schema:
 *               type: array
 *               items:
 *                 type: object
 *                 properties:
 *                   id:
 *                     type: integer
 *                     example: 1
 *                   name:
 *                     type: string
 *                     example: "House Alpha"
 *                   address:
 *                     type: string
 *                     example: "123 Main St"
 */
router.get('/', houseController.getAllHouses);

/**
 * @swagger
 * /houses/{id}:
 *   get:
 *     summary: Get a house by ID
 *     tags: [Houses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The house ID
 *     responses:
 *       200:
 *         description: House details
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 id:
 *                   type: integer
 *                   example: 1
 *                 name:
 *                   type: string
 *                   example: "House Alpha"
 *                 address:
 *                   type: string
 *                   example: "123 Main St"
 *       404:
 *         description: House not found
 */
router.get('/:id', houseController.getHouse);

/**
 * @swagger
 * /houses/{id}:
 *   put:
 *     summary: Update a house by ID
 *     tags: [Houses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The house ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 example: "House Beta"
 *               address:
 *                 type: string
 *                 example: "456 Elm St"
 *     responses:
 *       200:
 *         description: House updated successfully
 *       404:
 *         description: House not found
 */
router.put('/:id', houseController.updateHouse);

/**
 * @swagger
 * /houses/{id}:
 *   delete:
 *     summary: Delete a house by ID
 *     tags: [Houses]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: integer
 *         description: The house ID
 *     responses:
 *       200:
 *         description: House deleted successfully
 *       404:
 *         description: House not found
 */
router.delete('/:id', houseController.deleteHouse);

module.exports = router;
