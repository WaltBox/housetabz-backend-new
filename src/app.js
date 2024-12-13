const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
// At the very top of app.js and config.js
require('dotenv').config();

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerConfig');
const { sequelize } = require('./models'); // Import Sequelize instance
const config = require('./config/config');

// Import route files
const userRoutes = require('./routes/userRoutes');
const houseRoutes = require('./routes/houseRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const serviceRequestBundleRoutes = require('./routes/serviceRequestBundleRoutes');
const billRoutes = require('./routes/billRoutes');
const chargeRoutes = require('./routes/chargeRoutes');
const taskRoutes = require('./routes/taskRoutes');
const rhythmOffersRoutes = require('./routes/rhythmOffersRoutes');
const rhythmOfferRequestRoutes = require('./routes/rhythmOfferRequestRoutes');
const sparklyRequestRoutes = require('./routes/sparklyRequestRoutes');
const houseServiceRoutes = require('./routes/houseServiceRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const dealRoutes = require('./routes/dealRoutes');

// Initialize Express app
const app = express();

// Middleware
app.use(cors());
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
app.use('/api/v2/rhythm-offers', rhythmOffersRoutes);
app.use('/api/user', rhythmOfferRequestRoutes);
app.use('/api/partners', sparklyRequestRoutes);
app.use('/api/house-services', houseServiceRoutes);
app.use('/api', notificationRoutes);
app.use('/api/deals', dealRoutes);

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
    console.log(`Connecting to database at: ${config.databaseUrl}`);
    await sequelize.authenticate();
    console.log('Database connection established successfully!');

    await sequelize.sync({ alter: true });
    console.log('Database synced');

    app.listen(config.port, () => {
      console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
    });
  } catch (error) {
    console.error('Unable to start the server:', error.message);
    process.exit(1); // Exit if there’s a fatal error
  }
})();
