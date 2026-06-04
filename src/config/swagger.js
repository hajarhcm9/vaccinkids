const fs = require('fs');
const swaggerJsdoc = require('swagger-jsdoc');

const options = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'VacciniKids API',
      version: '1.0.0',
      description:
        'API de gestion des rendez-vous de vaccination infantile - Centre de Sante Es-Salaam, Oujda - PFE 2025/2026 ISPITS Oujda',
      contact: {
        name: 'Equipe VacciniKids',
        email: 'contact@vaccinikids.ma',
      },
    },
    servers: [
      { url: 'http://localhost:3000', description: 'Development' },
      { url: 'https://vaccinikids.onrender.com', description: 'Production' },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
      schemas: {
        Error: {
          type: 'object',
          properties: {
            status: { type: 'integer' },
            message: { type: 'string' },
          },
        },
      },
    },
    tags: [
      { name: 'Auth', description: 'Authentication' },
      { name: 'Sessions', description: 'Sessions de vaccination' },
      { name: 'RendezVous', description: 'Rendez-vous' },
      { name: 'Vaccins', description: 'Vaccins' },
      { name: 'Vaccinations', description: 'Vaccinations' },
      { name: 'Carnet', description: 'Carnet de sante' },
      { name: 'Flacons', description: 'Gestion des flacons' },
      { name: 'Stock', description: 'Gestion du stock' },
      { name: 'Notifications', description: 'Notifications' },
      { name: 'FileAttente', description: 'File d attente digitale' },
      { name: 'Absenteeisme', description: 'Absenteeisme' },
      { name: 'AlertesRetard', description: 'Alertes retard vaccinal' },
      { name: 'Admin', description: 'Administration' },
      { name: 'Stats', description: 'Statistiques' },
      { name: 'Recherche', description: 'Recherche globale' },
      { name: 'Emails', description: 'Envoi emails' },
      { name: 'PDF', description: 'Generation PDF' },
      { name: 'Exports', description: 'Exports PDF/Excel' },
      { name: 'Sync', description: 'Synchronisation offline' },
    ],
  },
  apis: ['src/routes/*.js'],
};

const specOpenAPI = swaggerJsdoc(options);
try {
  var mp = JSON.parse(fs.readFileSync(__dirname + '/swagger-paths.json', 'utf8'));
  Object.assign(specOpenAPI.paths, mp);
} catch (error) {
  console.warn('Swagger path extensions could not be loaded:', error.message);
}

module.exports = specOpenAPI;
