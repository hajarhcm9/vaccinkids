const Statistique = require('../models/Statistique');
const catchAsync = require('../utils/catchAsync');
const { success } = require('../utils/responseHandler');

const getDashboard = catchAsync(async (req, res) => {
  const role = req.user.role;
  const centreId = req.user.centre_id;

  if (role === 'admin') {
    const stats = await Statistique.getDashboardGlobal();
    return success(res, 200, 'Statistiques globales du tableau de bord', stats);
  }

  if (centreId) {
    const stats = await Statistique.getDashboardCentre(centreId);
    return success(res, 200, 'Statistiques du centre', stats);
  }

  return success(res, 200, 'Aucun centre assigné', {});
});

const getVaccinationsMensuelles = catchAsync(async (req, res) => {
  const annee = parseInt(req.query.annee, 10) || new Date().getFullYear();
  const data = await Statistique.getVaccinationsMensuelles(annee);
  return success(res, 200, 'Vaccinations mensuelles', data);
});

const getRdvParStatut = catchAsync(async (req, res) => {
  const centreId = req.user.role === 'admin' ? (req.query.centre_id || null) : req.user.centre_id;
  const data = await Statistique.getRdvParStatut(centreId);
  return success(res, 200, 'Rendez-vous par statut', data);
});

const getStockAlertes = catchAsync(async (req, res) => {
  const centreId = req.user.role === 'admin' ? (req.query.centre_id || null) : req.user.centre_id;
  const data = await Statistique.getStockAlertes(centreId);
  return success(res, 200, 'Alertes de stock', data);
});

const getTopVaccins = catchAsync(async (req, res) => {
  const centreId = req.user.role === 'admin' ? (req.query.centre_id || null) : req.user.centre_id;
  const data = await Statistique.getTopVaccins(centreId);
  return success(res, 200, 'Top vaccins', data);
});

module.exports = {
  getDashboard,
  getVaccinationsMensuelles,
  getRdvParStatut,
  getStockAlertes,
  getTopVaccins,
};
