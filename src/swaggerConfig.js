const swaggerJsDoc = require('swagger-jsdoc');

const isLocal = process.env.NODE_ENV === 'development_local';

const swaggerOptions = {
  swaggerDefinition: {
    openapi: '3.0.0',
    info: {
      title: 'HouseTabz API',
      version: '1.0.0',
      description: 'API documentation for the HouseTabz backend',
    },
    servers: [
      {
        url: 'http://localhost:3004/api', // Local development server
        description: 'Local development server',
      },
      {
        url: 'https://api.housetabz.com/api', // Production server
        description: 'Production server',
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the routes file where JSDoc comments are present
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

module.exports = swaggerSpec;
