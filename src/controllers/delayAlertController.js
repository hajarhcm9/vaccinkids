const delayAlertService = require('../services/delayAlertService');
const { success } = require('../utils/responseHandler');
const catchAsync = require('../utils/catchAsync');

const DelayAlertController = {
  /**
   * GET /api/alertes-retard/centre/:centreId
   * Get all delayed vaccines for a specific centre.
   */
  getDelayedVaccinesByCentre: catchAsync(async (req, res, next) => {
    const { centreId } = req.params;
    const result = await delayAlertService.getDelayedVaccinesByCentre(parseInt(centreId));
    return success(res, 200, 'Vaccins en retard pour ce centre', result);
  }),

  /**
   * GET /api/alertes-retard/bebe/:bebeId
   * Get delayed vaccines for a specific baby.
   */
  getDelayedVaccinesForBebe: catchAsync(async (req, res, next) => {
    const { bebeId } = req.params;
    const result = await delayAlertService.getDelayedVaccinesForBebe(parseInt(bebeId));

    if (result.length === 0) {
      return success(res, 200, 'Aucun retard vaccinal pour ce bebe', []);
    }
    return success(res, 200, 'Vaccins en retard', result);
  }),

  /**
   * GET /api/alertes-retard/dashboard
   * Get overview of all delayed vaccines across centres.
   */
  getDelayDashboard: catchAsync(async (req, res, next) => {
    const result = await delayAlertService.getDelayDashboard();
    return success(res, 200, 'Tableau de bord des retards vaccinaux', result);
  }),

  /**
   * POST /api/alertes-retard/send-alerts
   * Send delay alert notifications to parents.
   */
  sendDelayAlerts: catchAsync(async (req, res, next) => {
    const { centreId } = req.body;
    const result = await delayAlertService.sendDelayAlerts(centreId ? parseInt(centreId) : null);
    return success(res, 200, 'Alertes de retard envoyees', result);
  }),
};

module.exports = DelayAlertController;
