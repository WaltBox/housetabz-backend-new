const express = require('express');
const router = express.Router();
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const db = require('../models'); // Importing the models
const partnerController = require('../controllers/partnerController');
const formController = require('../controllers/formController');
const parameterController = require('../controllers/parameterController');
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
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
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
 */
router.post('/', async (req, res, next) => {
  try {
    const { name, description, type } = req.query;

    if (!name || !type) {
      return res.status(400).json({ message: 'Name and type are required fields.' });
    }

    if (!['plannable', 'formable'].includes(type)) {
      return res.status(400).json({ message: 'Invalid type. Allowed values are plannable or formable.' });
    }

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
 *     summary: Get partner by ID with service offers or forms and parameters
 *     tags: [Partners]
 */
router.get('/:id', partnerController.getPartnerWithOffers);

/**
 * @swagger
 * /partners/{id}:
 *   patch:
 *     summary: Update partner details including file uploads
 *     tags: [Partners]
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
      updateData.type = type;
    }

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

/**
 * @swagger
 * /partners/{partnerId}/forms:
 *   post:
 *     summary: Create a form for a partner
 *     tags: [Forms]
 */
router.post('/:partnerId/forms', formController.createForm);

/**
 * @swagger
 * /partners/{partnerId}/forms:
 *   get:
 *     summary: Get all forms and parameters for a partner
 *     tags: [Forms]
 */
router.get('/:partnerId/forms', formController.getFormsWithParameters);

/**
 * @swagger
 * /partners/{partnerId}/forms/parameters:
 *   post:
 *     summary: Add a parameter to a partner's form
 *     tags: [Parameters]
 */
router.post('/:partnerId/forms/parameters', parameterController.addParameter);

/**
 * @swagger
 * /partners/{partnerId}/forms/parameters/{id}:
 *   delete:
 *     summary: Delete a parameter from a partner's form
 *     tags: [Parameters]
 */
router.delete('/:partnerId/forms/parameters/:id', parameterController.deleteParameter);

router.get('/:partnerId/forms/parameters', async (req, res) => {
  try {
    const { partnerId } = req.params;

    const forms = await db.Form.findAll({
      where: { partnerId },
      include: [{ model: db.Parameter, as: 'parameters' }],
    });

    if (!forms.length) {
      return res.status(404).json({ message: 'No parameters found for this partner.' });
    }

    res.status(200).json(forms);
  } catch (error) {
    console.error('Error fetching parameters:', error);
    res.status(500).json({ message: 'Failed to fetch parameters.' });
  }
});


module.exports = router;
