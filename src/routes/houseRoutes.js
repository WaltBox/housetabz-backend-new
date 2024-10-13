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
 *               address_line:
 *                 type: string
 *                 example: "123 Main St"
 *               secondary_line:
 *                 type: string
 *                 example: "Apt 4B"
 *               city:
 *                 type: string
 *                 example: "Austin"
 *               state:
 *                 type: string
 *                 example: "TX"
 *               zip_code:
 *                 type: string
 *                 example: "78701"
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
 *                   address_line:
 *                     type: string
 *                     example: "123 Main St"
 *                   secondary_line:
 *                     type: string
 *                     example: "Apt 4B"
 *                   city:
 *                     type: string
 *                     example: "Austin"
 *                   state:
 *                     type: string
 *                     example: "TX"
 *                   zip_code:
 *                     type: string
 *                     example: "78701"
 */
router.get('/', houseController.getAllHouses);

/**
 * @swagger
 * /houses/{id}:
 *   get:
 *     summary: Get a house by ID with associated users
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
 *         description: House details with associated users
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
 *                 address_line:
 *                   type: string
 *                   example: "123 Main St"
 *                 secondary_line:
 *                   type: string
 *                   example: "Apt 4B"
 *                 city:
 *                   type: string
 *                   example: "Austin"
 *                 state:
 *                   type: string
 *                   example: "TX"
 *                 zip_code:
 *                   type: string
 *                   example: "78701"
 *                 users:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       id:
 *                         type: integer
 *                         example: 1
 *                       username:
 *                         type: string
 *                         example: "john_doe"
 *                       email:
 *                         type: string
 *                         example: "john@example.com"
 *                       balance:
 *                         type: number
 *                         example: 50
 *                       points:
 *                         type: integer
 *                         example: 100
 *                       credit:
 *                         type: integer
 *                         example: 10
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
 *               address_line:
 *                 type: string
 *                 example: "456 Elm St"
 *               secondary_line:
 *                 type: string
 *                 example: "Apt 10C"
 *               city:
 *                 type: string
 *                 example: "Dallas"
 *               state:
 *                 type: string
 *                 example: "TX"
 *               zip_code:
 *                 type: string
 *                 example: "75201"
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
