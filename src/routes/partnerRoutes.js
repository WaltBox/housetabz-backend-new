const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../models'); // Importing the models
const partnerController = require('../controllers/partnerController');
const Partner = db.Partner; // Access the Partner model

// Ensure the uploads directory exists
const uploadDir = path.join(__dirname, '../uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
  console.log('Uploads folder created.');
}

// Configure multer for file uploads
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // Save uploads in 'uploads' folder
  },
  filename: (req, file, cb) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, `${file.fieldname}-${uniqueSuffix}-${file.originalname}`);
  },
});

// File upload handler
const upload = multer({ storage });

/**
 * @swagger
 * /partners:
 *   post:
 *     summary: Add a new partner
 *     tags: [Partners]
 *     parameters:
 *       - in: query
 *         name: type
 *         required: true
 *         schema:
 *           type: string
 *           enum: ["plannable", "formable"]
 *         description: "Type of partner. Choose from 'plannable' or 'formable'."
 *       - in: query
 *         name: name
 *         required: true
 *         schema:
 *           type: string
 *         description: "Name of the partner."
 *       - in: query
 *         name: description
 *         required: false
 *         schema:
 *           type: string
 *         description: "Short description of the partner."
 *     responses:
 *       201:
 *         description: Partner added successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 message:
 *                   type: string
 *                   example: "Partner added successfully"
 *                 partner:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Rhythm Energy"
 *                     description:
 *                       type: string
 *                       example: "Energy provider offering renewable energy solutions."
 *                     type:
 *                       type: string
 *                       example: "plannable"
 */
router.post('/', async (req, res, next) => {
    try {
      const { name, description, type } = req.query;
  
      // Validate required fields
      if (!name || !type) {
        return res.status(400).json({ message: 'Name and type are required fields.' });
      }
  
      // Validate the `type` field
      if (!['plannable', 'formable'].includes(type)) {
        return res.status(400).json({ message: 'Invalid type. Allowed values are plannable or formable.' });
      }
  
      // Create the new partner
      const partner = await Partner.create({
        name,
        description,
        type,
      });
  
      res.status(201).json({ message: 'Partner added successfully', partner });
    } catch (error) {
      console.error('Error creating partner:', error);
      next(error);
    }
  });
  

/**
 * @swagger
 * /partners:
 *   get:
 *     summary: Get all partners
 *     tags: [Partners]
 *     responses:
 *       200:
 *         description: List of all partners
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
 *                     example: "Rhythm Energy"
 *                   description:
 *                     type: string
 *                     example: "Energy provider"
 */
router.get('/', partnerController.getAllPartners);

/**
 * @swagger
 * /partners/{id}:
 *   get:
 *     summary: Get partner by ID with service offers (if applicable)
 *     tags: [Partners]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the partner to retrieve
 *         example: 1
 *     responses:
 *       200:
 *         description: Partner details with service offers (if available)
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 partner:
 *                   type: object
 *                   properties:
 *                     id:
 *                       type: integer
 *                       example: 1
 *                     name:
 *                       type: string
 *                       example: "Rhythm Energy"
 *                     description:
 *                       type: string
 *                       example: "Energy provider"
 *                 serviceOffers:
 *                   type: array
 *                   items:
 *                     type: object
 *                     properties:
 *                       uuid:
 *                         type: string
 *                         example: "abc123-uuid"
 *                       title:
 *                         type: string
 *                         example: "12-Month Plan"
 *                       term_months:
 *                         type: integer
 *                         example: 12
 *                       rhythm_kwh_rate:
 *                         type: number
 *                         example: 0.11
 *                       price_1000_kwh:
 *                         type: number
 *                         example: 110.00
 *                       renewable_energy:
 *                         type: boolean
 *                         example: true
 *                       description_en:
 *                         type: string
 *                         example: "Affordable renewable energy plan."
 *       404:
 *         description: Partner not found
 *       500:
 *         description: Internal server error
 */
router.get('/:id', partnerController.getPartnerWithOffers);

/**
 * @swagger
 * /partners/{id}:
 *   patch:
 *     summary: Update partner details including file uploads
 *     tags: [Partners]
 *     parameters:
 *       - in: path
 *         name: id
 *         schema:
 *           type: integer
 *         required: true
 *         description: Numeric ID of the partner to update
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               logo:
 *                 type: string
 *                 format: binary
 *                 description: Logo file for the partner
 *               marketplace_cover:
 *                 type: string
 *                 format: binary
 *                 description: Marketplace cover image file
 *               company_cover:
 *                 type: string
 *                 format: binary
 *                 description: Company cover image file
 *               about:
 *                 type: string
 *                 description: About information for the partner
 *               important_information:
 *                 type: string
 *                 description: Important information about the partner
 *               type:
 *                 type: string
 *                 enum: ["plannable", "formable"]
 *     responses:
 *       200:
 *         description: Partner updated successfully
 *       404:
 *         description: Partner not found
 *       500:
 *         description: Internal server error
 */
router.patch('/:id', upload.fields([
  { name: 'logo', maxCount: 1 },
  { name: 'marketplace_cover', maxCount: 1 },
  { name: 'company_cover', maxCount: 1 },
]), async (req, res, next) => {
  try {
    const { id } = req.params;
    const { about, important_information, type } = req.body;

    const partner = await Partner.findByPk(id);
    if (!partner) {
      return res.status(404).json({ message: 'Partner not found' });
    }

    const updateData = { about, important_information };
    if (type) {
      updateData.type = type; // Add type to the update
    }

    // Check for uploaded files and add their paths to the update
    if (req.files['logo']) {
      updateData.logo = req.files['logo'][0].path;
    }
    if (req.files['marketplace_cover']) {
      updateData.marketplace_cover = req.files['marketplace_cover'][0].path;
    }
    if (req.files['company_cover']) {
      updateData.company_cover = req.files['company_cover'][0].path;
    }

    await partner.update(updateData);
    res.status(200).json({ message: 'Partner updated successfully', partner });
  } catch (error) {
    next(error);
  }
});

module.exports = router;
