// src/app.js
const express = require('express');
const cors = require('cors');
const config = require('./config/config');
const userRoutes = require('./routes/userRoutes');
const houseRoutes = require('./routes/houseRoutes');
const partnerRoutes = require('./routes/partnerRoutes');
const servicePlanRoutes = require('./routes/servicePlanRoutes');
const houseServiceRoutes = require('./routes/houseServiceRoutes');
const { sequelize } = require('./models');
const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerConfig');
const morgan = require('morgan');

const app = express();

// Middleware
app.use(cors());
app.use(express.json());
app.use(morgan('dev'));

// Swagger setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Routes
app.use('/api/users', userRoutes);  // Keep only this line for users
app.use('/api/houses', houseRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/service-plans', servicePlanRoutes);  // Updated route
app.use('/api/houses', houseServiceRoutes);  // House services as sub-route to houses

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
sequelize.sync({ alter: true })
  .then(() => {
    console.log('Database synced');
    app.listen(config.port, () => {
      console.log(`Server running in ${config.nodeEnv} mode on port ${config.port}`);
    });
  })
  .catch(err => console.error('Unable to sync database:', err));
