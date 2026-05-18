const Recherche = require('../models/Recherche');
const catchAsync = require('../utils/catchAsync');
const { success } = require('../utils/responseHandler');

const searchGlobal = catchAsync(async (req, res) => {
  const { q } = req.query;
  if (!q || q.trim().length < 2) {
    return success(res, 200, 'Search query too short', { bebes: [], parents: [], centres: [], vaccins: [] });
  }
  const userId = req.user.centre_id;
  const role = req.user.role;
  const data = await Recherche.searchGlobal(q.trim(), userId, role);
  return success(res, 200, 'Search results', data);
});

const searchRendezVous = catchAsync(async (req, res) => {
  const data = await Recherche.searchRendezVous(req.query);
  return success(res, 200, 'Rendez-vous search results', data);
});

const searchVaccinations = catchAsync(async (req, res) => {
  const data = await Recherche.searchVaccinations(req.query);
  return success(res, 200, 'Vaccinations search results', data);
});

const searchSessions = catchAsync(async (req, res) => {
  const data = await Recherche.searchSessions(req.query);
  return success(res, 200, 'Sessions search results', data);
});

module.exports = {
  searchGlobal,
  searchRendezVous,
  searchVaccinations,
  searchSessions,
};
