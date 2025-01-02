const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config(); // Load environment variables

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerConfig');

// Load environment and configuration
const environment = process.env.NODE_ENV || 'development';
const config = require('./config/config'); // Import configuration for current environment

const { sequelize } = require('./models'); // Import Sequelize instance

// Import route files
const userRoutes = require('./routes/userRoutes');
const houseRoutes = require('./routes/houseRoutes');
const serviceRequestBundleRoutes = require('./routes/serviceRequestBundleRoutes');
const billRoutes = require('./routes/billRoutes');
const chargeRoutes = require('./routes/chargeRoutes');
const taskRoutes = require('./routes/taskRoutes');
const houseServiceRoutes = require('./routes/houseServiceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dealRoutes = require('./routes/dealRoutes');
const waitListRoutes = require('./routes/waitListRoutes');
const partnerFormRoutes = require('./routes/partnerFormRoutes');
const contactRoutes = require('./routes/contactRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const stagedRequestRoutes = require('./routes/stagedRequestRoutes');
// Initialize Express app
const app = express();

// Middleware
app.use(cors({
  origin: ['https://www.housetabz.com', 'http://localhost:3000'], // Add localhost for development
  methods: ['GET', 'POST', 'PUT', 'DELETE'], // Allowed HTTP methods
}));

app.use(express.json());
app.use(morgan('dev'));

// Serve static files
app.use('/uploads', express.static('uploads'));

// Swagger setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/users', userRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api', serviceRequestBundleRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/houses', billRoutes);
app.use('/api/users', chargeRoutes);
app.use('/api/house-services', houseServiceRoutes);
app.use('/api', notificationRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/waitlist', waitListRoutes);
app.use('/api/partner-forms', partnerFormRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api', stagedRequestRoutes);
// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to HouseTabz Backend!' });
});

// Log all registered routes
app._router.stack.forEach((r) => {
  if (r.route && r.route.path) {
    console.log(`Route registered: ${r.route.path}`);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Sync database and start the server
(async () => {
  try {
    console.log(`NODE_ENV is set to: ${environment}`);
    console.log(`Connecting to database at: ${config.url}`);
    console.log(`Using configuration: ${JSON.stringify(config, null, 2)}`);

    await sequelize.authenticate();
    console.log('Database connection established successfully!');

    await sequelize.sync({ alter: true });
    console.log('Database synced');

    const port = config.port; // Access the correct port value
    app.listen(port, () => {
      console.log(`Server running in ${environment} mode on port ${port}`);
    });
  } catch (error) {
    console.error('Unable to start the server:', error.message);
    process.exit(1); // Exit if there’s a fatal error
  }
})();
