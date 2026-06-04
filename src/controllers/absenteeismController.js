const absenteeismService = require('../services/absenteeismService');
const { success, notFound } = require('../utils/responseHandler');
const catchAsync = require('../utils/catchAsync');

const AbsenteeismController = {
  /**
   * POST /api/absenteisme/mark-absent/:rdvId
   * Manually mark an RDV as ABSENT (nurse/admin).
   */
  markAbsent: catchAsync(async (req, res, next) => {
    const { rdvId } = req.params;
    const result = await absenteeismService.markAbsentManual(parseInt(rdvId));

    if (result.error) {
      if (result.error.includes('non trouve')) {
        return notFound(res, result.error);
      }
      return res.status(400).json({
        status: 'error',
        message: result.error,
      });
    }

    const message = result.isHabitualAbsent
      ? 'Parent marque absent - ATTENTION: absentisme habituel (2+ absences consecutives)'
      : 'Rendez-vous marque comme absent avec succes';

    return success(res, 200, message, {
      ...result,
      alert: result.isHabitualAbsent
        ? "Ce parent a 2 absences consecutives ou plus. Une notification d'alerte a ete envoyee."
        : null,
    });
  }),

  /**
   * POST /api/absenteisme/process-session/:sessionId
   * Process all no-shows for a session.
   */
  processSessionNoShows: catchAsync(async (req, res, next) => {
    const { sessionId } = req.params;
    const { gracePeriodMinutes } = req.body;

    const result = await absenteeismService.processSessionNoShows(
      parseInt(sessionId),
      gracePeriodMinutes ? parseInt(gracePeriodMinutes) : 15,
    );

    if (!result.processed) {
      return res.status(400).json({
        status: 'error',
        message: result.error || 'Impossible de traiter la session',
      });
    }

    return success(res, 200, 'No-shows traites avec succes', {
      markedAbsent: result.markedAbsent.length,
      promoted: result.promoted.length,
      details: result,
    });
  }),

  /**
   * GET /api/absenteisme/habitual-absents
   */
  getHabitualAbsents: catchAsync(async (req, res, next) => {
    const { centreId } = req.query;
    const absents = await absenteeismService.getHabitualAbsents(
      centreId ? parseInt(centreId) : null,
    );
    return success(res, 200, 'Liste des absents habituels', absents);
  }),

  /**
   * GET /api/absenteisme/parent/:parentId/history
   */
  getParentAbsenceHistory: catchAsync(async (req, res, next) => {
    const { parentId } = req.params;
    const history = await absenteeismService.getParentAbsenceHistory(parseInt(parentId));
    return success(res, 200, 'Historique des absences', history);
  }),

  /**
   * GET /api/absenteisme/session/:sessionId/absents
   */
  getSessionAbsences: catchAsync(async (req, res, next) => {
    const { sessionId } = req.params;
    const absences = await absenteeismService.getSessionAbsences(parseInt(sessionId));
    return success(res, 200, 'Liste des absences pour cette session', absences);
  }),

  /**
   * GET /api/absenteisme/stats
   */
  getAbsenteismeStats: catchAsync(async (req, res, next) => {
    const stats = await absenteeismService.getAbsenteismeStats();
    return success(res, 200, "Statistiques d'absenteisme", stats);
  }),
};

module.exports = AbsenteeismController;
