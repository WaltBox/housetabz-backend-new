const express = require('express');
const cors = require('cors');
const morgan = require('morgan');
require('dotenv').config(); // Load environment variables

const swaggerUi = require('swagger-ui-express');
const swaggerSpec = require('./swaggerConfig');

// Load environment and configuration
const environment = process.env.NODE_ENV || 'development';

const fullConfig = require('./config/config');
const config = fullConfig[environment]; // 👈 This gets development_local, etc.

const { apiLimiter: limiter, blockPaths } = require('./middleware/security/rateLimiter');

const { sequelize } = require('./models'); // Import Sequelize instance
const { startUrgentMessageSchedulers } = require('./utils/urgentMessageScheduler');
const { startBillSchedulers } = require('./utils/billScheduler');
const { startLatePaymentScheduler } = require('./utils/latePaymentScheduler');
const { startHouseRiskScheduler } = require('./utils/houseRiskScheduler');
const paymentReminderWorker = require('./workers/paymentReminderWorker');


// const { authenticateUser } = require('./middleware/auth/userAuth');
// const { authenticatePartner } = require('./middleware/auth/partnerAuth');
// const { authenticateWebhook } = require('./middleware/auth/webhookAuth');
// Import route files
const sdkRoutes = require('./routes/sdkRoutes')
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
const adminRoutes = require('./routes/adminRoutes');
const adminUserRoutes = require('./routes/adminUserRoutes');
const adminHouseRoutes = require('./routes/adminHouseRoutes');
const referrerRoutes = require('./routes/referrerRoutes');
const paymentRoutes = require('./routes/paymentRoutes');
const confirmRequestRoutes = require('./routes/confirm-request');
const paymentMethodRoutes = require('./routes/paymentMethodRoutes');
const authRoutes = require('./routes/authRoutes');
const virtualCardRequestRoutes = require('./routes/virtualCardRequestRoutes');
const takeOverRequestRoutes = require('./routes/takeOverRequestRoutes');
const memeQRCodeRoutes = require('./routes/memeQRCodeRoutes'); // Import the new routes file
const userFinanceRoutes = require('./routes/userFinanceRoutes');
const houseFinanceRoutes = require('./routes/houseFinanceRoutes');
const billSubmissionRoutes = require('./routes/billSubmissionRoutes');
const urgentMessageRoutes = require('./routes/urgentMessageRoutes');  
const HouseServiceLedgerRoutes = require('./routes/houseServiceLedgerRoutes')
const reminderRoutes = require('./routes/reminderRoutes')
const transactionRoutes = require('./routes/transactionRoutes');
const feedbackRoutes = require('./routes/feedbackRoutes');
const dashboardRoutes = require('./routes/dashboardRoutes');
const paymentReminderRoutes = require('./routes/paymentReminderRoutes');
const healthRoutes = require('./routes/healthRoutes');
const botFilter = require('./middleware/security/botFilter');

// Initialize Express app
const app = express();

// Define CORS options
const corsOptions = {
  origin: [
    'http://localhost:3000',
    'http://localhost:3001',
    'https://www.housetabz.com',
    'https://housetabz.com',
    'com.housetabz.mobile://',
    'http://localhost:8080',
    'https://ad24-2605-a601-a0f0-dd00-550d-8071-2819-dd8f.ngrok-free.app'
  ],
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS', 'PATCH'],
  allowedHeaders: [
    'Content-Type', 
    'x-api-key',      
    'x-housetabz-service-key',      
    'housetabz-timestamp', 
    'housetabz-signature',
    'Origin', 
    'Accept',
    'Authorization',
    'Stripe-Signature'
  ],
  credentials: true
};

// Apply CORS first, before any other middleware
app.use(cors(corsOptions));

// Handle preflight requests explicitly
app.options('*', cors(corsOptions));

app.get('/robots.txt', (req, res) => {
  res.type('text/plain');
  res.send(`User-agent: *
Disallow: /api/
Disallow: /admin/
Disallow: /webhook/
Allow: /health
Allow: /`);
});

// Root route
app.get('/', (req, res) => {
  res.json({ message: 'Welcome to HouseTabz Backend!' });
});

// Apply bot filter but skip for OPTIONS requests
app.use((req, res, next) => {
  if (req.method === 'OPTIONS') {
    return next();
  }
  botFilter(req, res, next);
});

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

// Apply rate limiting and path blocking (except for Stripe webhooks and OPTIONS)
app.use((req, res, next) => {
  if (req.method === 'OPTIONS' || req.originalUrl === '/api/payments/webhook') {
    next();
  } else {
    limiter(req, res, next);
  }
});
app.use(blockPaths);

// Serve static files
app.use('/uploads', express.static('uploads'));
app.use('/api/stripe/webhook', require('./routes/stripeWebhookRoutes'));
// Swagger setup
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));

// Apply routes
app.use('/api/sdk', sdkRoutes);
app.use('/api/users', userRoutes);
app.use('/api/houses', houseRoutes);
app.use('/api/partners', partnerRoutes);
app.use('/api/service-request-bundles', serviceRequestBundleRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/bills', billRoutes);

app.use('/api/users', chargeRoutes);
app.use('/api/houseServices', houseServiceRoutes);
app.use('/api', notificationRoutes);
app.use('/api/deals', dealRoutes);
app.use('/api/waitlist', waitListRoutes);
app.use('/api/partner-forms', partnerFormRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/contact', contactRoutes);
app.use('/api/referral-program', referrerRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/payment-methods', paymentMethodRoutes);
app.use('/api/payment-system', require('./routes/paymentHealthRoutes'));
app.use('/confirm-request', confirmRequestRoutes);
app.use('/api/auth', authRoutes);
app.use('/api/virtual-card-requests', virtualCardRequestRoutes);
app.use('/api/take-over-requests', takeOverRequestRoutes);
app.use('/api/meme-qr-codes', memeQRCodeRoutes);
app.use('/api', userFinanceRoutes);
app.use('/api', houseFinanceRoutes);
app.use('/api', billSubmissionRoutes);
app.use('/api', feedbackRoutes );
app.use('/api', reminderRoutes);
app.use('/api', HouseServiceLedgerRoutes);
app.use('/api/admin/transactions', transactionRoutes);
app.use('/api/admin/users', adminUserRoutes);          // User management
app.use('/api/admin/houses', adminHouseRoutes);
app.use('/api/urgent-messages', urgentMessageRoutes);
app.use('/api/dashboard', dashboardRoutes);
app.use('/api/reminders', paymentReminderRoutes);
app.use('/api', healthRoutes);

// For debugging, add this middleware before your routes
app.use((req, res, next) => {
 
  next();
});

// Log all registered routes in development
if (environment === 'development') {
  app._router.stack.forEach((r) => {
    if (r.route && r.route.path) {
   
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

    
    if (environment === 'development') {
    
    }

    await sequelize.authenticate();
    

    await sequelize.sync({ alter: true });
  

    
    startBillSchedulers();
 

    startLatePaymentScheduler();
  

    startHouseRiskScheduler();    // Weekly risk assessment
 

    startUrgentMessageSchedulers(); 
  
    // Start payment reminder worker
    paymentReminderWorker.start();
  
    // Use the PORT environment variable set by Elastic Beanstalk, or fall back to config.port or 8080
    const port = process.env.PORT || config.port || 8080;
    app.listen(port, () => {
 
      if (environment === 'development') {
   
      }
    });
  } catch (error) {
    console.error('Unable to start the server:', error);

    process.exit(1); // Exit if there's a fatal error
  }
})();

module.exports = app;