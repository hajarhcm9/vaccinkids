const statistiqueSchemas = {
  vaccinationsMensuelles: {
    annee: { type: 'number', required: false },
  },
  rdvParStatut: {
    centre_id: { type: 'number', required: false },
  },
  stockAlertes: {
    centre_id: { type: 'number', required: false },
  },
  topVaccins: {
    centre_id: { type: 'number', required: false },
  },
};

module.exports = { statistiqueSchemas };
