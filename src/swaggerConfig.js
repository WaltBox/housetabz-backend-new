// src/swaggerConfig.js
const swaggerJsDoc = require('swagger-jsdoc');

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
        url: 'http://housetabz-back-env.eba-k7z4g8fa.us-east-1.elasticbeanstalk.com/api',
      },
    ],
  },
  apis: ['./src/routes/*.js'], // Path to the routes file where JSDoc comments are present
};

const swaggerSpec = swaggerJsDoc(swaggerOptions);

module.exports = swaggerSpec;
