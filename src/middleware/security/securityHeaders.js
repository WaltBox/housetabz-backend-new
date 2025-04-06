const helmet = require('helmet');

// Configure security headers
const securityHeaders = (app) => {
  // Use helmet with customized configuration
  app.use(
    helmet({
      contentSecurityPolicy: {
        directives: {
          defaultSrc: ["'self'"],
          scriptSrc: ["'self'", "'unsafe-inline'", "https://js.stripe.com"],
          styleSrc: ["'self'", "'unsafe-inline'"],
          imgSrc: ["'self'", "data:", "https://*.stripe.com"],
          connectSrc: ["'self'", "https://*.stripe.com", "https://*.plaid.com"],
          frameSrc: ["'self'", "https://*.stripe.com", "https://*.plaid.com"],
          upgradeInsecureRequests: []
        }
      },
      // Adjust these settings as needed for your application
      hsts: {
        maxAge: 15552000, // 180 days
        includeSubDomains: true,
        preload: true
      }
    })
  );

  // Additional headers not covered by helmet
  app.use((req, res, next) => {
    // Prevent browsers from incorrectly detecting non-scripts as scripts
    res.setHeader('X-Content-Type-Options', 'nosniff');
    // Don't allow the app to be in iframes other than from same origin
    res.setHeader('X-Frame-Options', 'SAMEORIGIN');
    // Prevent XSS attacks
    res.setHeader('X-XSS-Protection', '1; mode=block');
    next();
  });
};

module.exports = securityHeaders;