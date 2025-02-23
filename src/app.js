const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config(); // Load environment variables

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerConfig');

// Load environment and configuration
const environment = process.env.NODE_ENV || 'development';
const config = require('./config/config'); // Import configuration for current environment
const { limiter, blockPaths } = require('./middleware/requestLimiter');

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
const referrerRoutes = require('./routes/referrerRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const confirmRequestRoutes = require('./routes/confirm-request');
const paymentMethodRoutes = require('./routes/paymentMethodRoutes');
const authRoutes = require('./routes/authRoutes');
const virtualCardRequestRoutes = require('./routes/virtualCardRequestRoutes');
const takeOverRequestRoutes = require('./routes/takeOverRequestRoutes');
// Initialize Express app
const app = express();

// Define CORS options
const corsOptions = {
  origin: (origin, callback) => {
    const allowedOrigins = [
      'https://www.housetabz.com',    
      'http://localhost:3000',        
      'http://127.0.0.1:3000',        
      'http://localhost:3004',        
      'http://localhost:3004/api-docs',
      'http://localhost:8080',        // SDK testing
      'housetabz.com',               // For confirm page
      'https://housetabz.com',
      'http://localhost:8081',
      'http://localhost:3002'
    ];

    // Allow requests with no origin (like Stripe webhooks or Postman)
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      console.log(`Blocked request from unauthorized origin: ${origin}`);
      callback(new Error('Not allowed by CORS'));
    }
  },
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: [
    'Content-Type', 
    'X-HouseTabz-API-Key', 
    'X-HouseTabz-Secret-Key',
    'Origin', 
    'Accept',
    'Authorization',
    'Stripe-Signature'  // Added for Stripe webhook signatures
  ],
  credentials: true
};

// Apply CORS first
app.use(cors(corsOptions));

// Special handling for Stripe webhook endpoint
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    next(); // Let the raw body pass through for Stripe
  } else {
    express.json()(req, res, next); // Parse JSON for all other routes
  }
});

// Logging middleware
app.use(morgan(':method :url :status :response-time ms - :remote-addr :user-agent')); 

// Apply rate limiting and path blocking (except for Stripe webhooks)
app.use((req, res, next) => {
  if (req.originalUrl === '/api/payments/webhook') {
    next();
  } else {
    limiter(req, res, next);
  }
});
app.use(blockPaths);

// Serve static files
app.use('/uploads', express.static('uploads'));

// Swagger setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Apply routes
app.use('/api/users', userRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api', partnerRoutes);
app.use('/api', serviceRequestBundleRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/houses', billRoutes);
app.use('/api/users', chargeRoutes);
app.use('/api/houseServices', houseServiceRoutes);
app.use('/api', notificationRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/waitlist', waitListRoutes);
app.use('/api/partner-forms', partnerFormRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/referral-program', referrerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/confirm-request', confirmRequestRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/virtual-card-requests', virtualCardRequestRoutes);
app.use('/api/take-over-requests', takeOverRequestRoutes);
// For debugging, add this middleware before your routes
app.use((req, res, next) => {
  console.log(`${req.method} ${req.path}`, {
    body: req.body,
    query: req.query,
    params: req.params
  });
  next();
});
// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to HouseTabz Backend!' });
});

// Log all registered routes in development
if (environment === 'development') {
  app._router.stack.forEach((r) => {
    if (r.route && r.route.path) {
      console.log(`Route registered: ${r.route.path}`);
    }
  });
}

// Enhanced error handling middleware
app.use((err, req, res, next) => {
  console.error('Error:', err.stack);

  // Handle Stripe webhook signature verification errors
  if (err.type === 'StripeSignatureVerificationError') {
    return res.status(400).json({ 
      error: 'Invalid Stripe webhook signature',
      message: err.message
    });
  }

  // Handle Stripe API errors
  if (err.type === 'StripeError') {
    return res.status(err.statusCode || 400).json({
      error: 'Stripe API Error',
      message: err.message,
      code: err.code
    });
  }

  // Handle validation errors
  if (err.name === 'ValidationError' || err.name === 'SequelizeValidationError') {
    return res.status(400).json({
      error: 'Validation Error',
      message: err.message
    });
  }

  // Handle database errors
  if (err.name === 'SequelizeDatabaseError') {
    return res.status(500).json({
      error: 'Database Error',
      message: environment === 'development' ? err.message : 'An internal server error occurred'
    });
  }

  // Default error response
  res.status(500).json({ 
    error: 'Internal Server Error',
    message: environment === 'development' ? err.message : 'Something went wrong!'
  });
});

// Sync database and start the server
(async () => {
  try {
    console.log(`NODE_ENV is set to: ${environment}`);
    console.log(`Connecting to database at: ${config.url}`);
    
    if (environment === 'development') {
      console.log(`Using configuration: ${JSON.stringify(config, null, 2)}`);
    }

    await sequelize.authenticate();
    console.log('Database connection established successfully!');

    await sequelize.sync({ alter: true });
    console.log('Database synced');

    const port = config.port;
    app.listen(port, () => {
      console.log(`Server running in ${environment} mode on port ${port}`);
      console.log(`Swagger documentation available at: http://localhost:${port}/api-docs`);
      if (environment === 'development') {
        console.log(`Stripe webhook endpoint: http://localhost:${port}/api/payments/webhook`);
      }
    });
  } catch (error) {
    console.error('Unable to start the server:', error.message);
    process.exit(1); // Exit if there's a fatal error
  }
})();

module.exports = app;