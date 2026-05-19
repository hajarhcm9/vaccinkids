const statsService = require('../services/statsService');
const { success } = require('../utils/responseHandler');
const catchAsync = require('../utils/catchAsync');

const StatsController = {
  /**
   * GET /api/stats/dashboard
   * Get global dashboard KPIs.
   * Query params: centreId (optional)
   */
  getDashboard: catchAsync(async (req, res, next) => {
    const { centreId } = req.query;
    const result = await statsService.getDashboard(centreId ? parseInt(centreId) : null);
    return success(res, 200, 'Tableau de bord', result);
  }),

  /**
   * GET /api/stats/couverture-vaccinale
   * Get vaccination coverage statistics.
   * Query params: centreId (optional)
   */
  getCouvertureVaccinale: catchAsync(async (req, res, next) => {
    const { centreId } = req.query;
    const result = await statsService.getCouvertureVaccinale(centreId ? parseInt(centreId) : null);
    return success(res, 200, 'Couverture vaccinale', result);
  }),

  /**
   * GET /api/stats/sessions
   * Get session statistics.
   * Query params: centreId (optional)
   */
  getSessionStats: catchAsync(async (req, res, next) => {
    const { centreId } = req.query;
    const result = await statsService.getSessionStats(centreId ? parseInt(centreId) : null);
    return success(res, 200, 'Statistiques des sessions', result);
  }),

  /**
   * GET /api/stats/rendez-vous
   * Get RDV statistics.
   * Query params: centreId (optional)
   */
  getRdvStats: catchAsync(async (req, res, next) => {
    const { centreId } = req.query;
    const result = await statsService.getRdvStats(centreId ? parseInt(centreId) : null);
    return success(res, 200, 'Statistiques des rendez-vous', result);
  }),

  /**
   * GET /api/stats/stock
   * Get stock statistics.
   * Query params: centreId (optional)
   */
  getStockStats: catchAsync(async (req, res, next) => {
    const { centreId } = req.query;
    const result = await statsService.getStockStats(centreId ? parseInt(centreId) : null);
    return success(res, 200, 'Statistiques du stock', result);
  }),

  /**
   * GET /api/stats/absenteisme
   * Get absenteeism statistics.
   * Query params: centreId (optional)
   */
  getAbsenteeismeStats: catchAsync(async (req, res, next) => {
    const { centreId } = req.query;
    const result = await statsService.getAbsenteeismeStats(centreId ? parseInt(centreId) : null);
    return success(res, 200, "Statistiques d'absenteisme", result);
  }),

  /**
   * GET /api/stats/croissance
   * Get growth tracking statistics.
   * Query params: centreId (optional)
   */
  getCroissanceStats: catchAsync(async (req, res, next) => {
    const { centreId } = req.query;
    const result = await statsService.getCroissanceStats(centreId ? parseInt(centreId) : null);
    return success(res, 200, 'Statistiques de croissance', result);
  }),

  /**
   * GET /api/stats/comparaison-centres
   * Get comparison data between centres.
   */
  getComparaisonCentres: catchAsync(async (req, res, next) => {
    const result = await statsService.getComparaisonCentres();
    return success(res, 200, 'Comparaison inter-centres', result);
  }),

  /**
   * GET /api/stats/export
   * Get export data for reporting.
   * Query params: type (vaccinations|absenteisme|sessions|stock), centreId, dateDebut, dateFin
   */
  getExportData: catchAsync(async (req, res, next) => {
    const { type, centreId, dateDebut, dateFin } = req.query;

    if (!type || !['vaccinations', 'absenteisme', 'sessions', 'stock'].includes(type)) {
      return res.status(400).json({
        status: 'error',
        message: "Type d'export invalide. Utilisez: vaccinations, absenteisme, sessions, stock",
      });
    }

    const result = await statsService.getExportData(type, {
      centreId: centreId ? parseInt(centreId) : null,
      dateDebut: dateDebut || null,
      dateFin: dateFin || null,
    });
    return success(res, 200, 'Donnees exportees', result);
  }),
};

module.exports = StatsController;
