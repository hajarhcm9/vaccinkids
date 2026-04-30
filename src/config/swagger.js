const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VacciniKids API',
      version: '1.0.0',
      description: 'API de gestion des rendez-vous de vaccination - PFE 2025/2026 ISPITS Oujda',
      contact: {
        name: 'ISPITS Oujda',
        email: 'contact@vaccinikids.ma'
      }
    },
    servers: [
      {
        url: 'http://localhost:3000',
        description: 'Development server'
      }
    ]
  },
  apis: ['src/routes/*.js'],
};

const specOpenAPI = swaggerJsdoc(options);

module.exports = specOpenAPI;
