const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const userRoutes = require('./routes/userRoutes');
const houseRoutes = require('./routes/houseRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const serviceRequestBundleRoutes = require('./routes/serviceRequestBundleRoutes');
const billRoutes = require('./routes/billRoutes');  // Bill routes
const chargeRoutes = require('./routes/chargeRoutes');  // Charge routes
const taskRoutes = require('./routes/taskRoutes');
const rhythmOffersRoutes = require('./routes/rhythmOffersRoutes');  // Import rhythm offers route
const rhythmOfferRequestRoutes = require('./routes/rhythmOfferRequestRoutes');  // Import rhythm offer requests route
const sparklyRequestRoutes = require('./routes/sparklyRequestRoutes');
const houseServiceRoutes = require('./routes/houseServiceRoutes');

const dealRoutes = require('./routes/dealRoutes');
const { sequelize } = require('./models');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerConfig');
const morgan = require('morgan');
const fs = require('fs');
const path = require('path');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));



// Serve static files from the 'uploads' directory
app.use('/uploads', express.static('uploads'));


// Swagger setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/users', userRoutes);  // Users related routes
app.use('/api/houses', houseRoutes);
app.use('/api/partners', partnerRoutes);  // Partners related routes
app.use('/api', serviceRequestBundleRoutes);  // Service request bundles
app.use('/api/tasks', taskRoutes);  // Tasks (service requests)
app.use('/api/houses', billRoutes);  // For bills
app.use('/api/users', chargeRoutes);  // For user charges
app.use('/api/v2/rhythm-offers', rhythmOffersRoutes);  
app.use('/api/user', rhythmOfferRequestRoutes);
app.use('/api/partners', sparklyRequestRoutes);
app.use('/api/house-services', houseServiceRoutes);

app.use('/api/deals', dealRoutes);
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to HouseTabz Backend!' });
});

app._router.stack.forEach(function(r) {
  if (r.route && r.route.path) {
    console.log(r.route.path);
  }
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ message: 'Something went wrong!' });
});

// Sync database
sequelize.sync({ force: true })
  .then(() => {
    console.log('Database synced');
    app.listen(config.port, () => {
      console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
    });
  })
  .catch(err => console.error('Unable to sync database:', err));
