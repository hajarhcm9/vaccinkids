const adminService = require('../services/adminService');
const { success, created, notFound } = require('../utils/responseHandler');
const catchAsync = require('../utils/catchAsync');

const AdminController = {
  // ==========================================
  // PERSONNEL
  // ==========================================

  /**
   * POST /api/admin/personnel
   * Create a new personnel member (admin only).
   */
  createPersonnel: catchAsync(async (req, res, next) => {
    const result = await adminService.createPersonnel(req.body, req.user.id);

    return created(res, 'Personnel cree avec succes', result);
  }),

  /**
   * GET /api/admin/personnel
   * List all personnel with filters.
   */
  getPersonnel: catchAsync(async (req, res, next) => {
    const result = await adminService.getPersonnel(req.query);
    return success(res, 200, 'Liste du personnel', result);
  }),

  /**
   * GET /api/admin/personnel/:id
   * Get a single personnel member.
   */
  getPersonnelById: catchAsync(async (req, res, next) => {
    const personnel = await adminService.getPersonnelById(parseInt(req.params.id));

    if (!personnel) {
      return notFound(res, 'Personnel non trouve');
    }

    return success(res, 200, 'Details du personnel', personnel);
  }),

  /**
   * PATCH /api/admin/personnel/:id
   * Update a personnel member.
   */
  updatePersonnel: catchAsync(async (req, res, next) => {
    const result = await adminService.updatePersonnel(
      parseInt(req.params.id),
      req.body,
      req.user.id,
    );

    return success(res, 200, 'Personnel mis a jour', result);
  }),

  /**
   * PATCH /api/admin/personnel/:id/deactivate
   * Deactivate a personnel member.
   */
  deactivatePersonnel: catchAsync(async (req, res, next) => {
    const result = await adminService.deactivatePersonnel(parseInt(req.params.id), req.user.id);

    return success(res, 200, 'Personnel desactive', result);
  }),

  /**
   * PATCH /api/admin/personnel/:id/reactivate
   * Reactivate a personnel member.
   */
  reactivatePersonnel: catchAsync(async (req, res, next) => {
    const result = await adminService.reactivatePersonnel(parseInt(req.params.id), req.user.id);

    return success(res, 200, 'Personnel reactive', result);
  }),

  // ==========================================
  // CENTRES
  // ==========================================

  /**
   * POST /api/admin/centres
   * Create a new centre.
   */
  createCentre: catchAsync(async (req, res, next) => {
    const result = await adminService.createCentre(req.body, req.user.id);

    return created(res, 'Centre cree avec succes', result);
  }),

  /**
   * GET /api/admin/centres
   * List all centres with filters.
   */
  getCentres: catchAsync(async (req, res, next) => {
    const result = await adminService.getCentres(req.query);
    return success(res, 200, 'Liste des centres', result);
  }),

  /**
   * GET /api/admin/centres/:id
   * Get a single centre.
   */
  getCentreById: catchAsync(async (req, res, next) => {
    const centre = await adminService.getCentreById(parseInt(req.params.id));

    if (!centre) {
      return notFound(res, 'Centre non trouve');
    }

    return success(res, 200, 'Details du centre', centre);
  }),

  /**
   * PATCH /api/admin/centres/:id
   * Update a centre.
   */
  updateCentre: catchAsync(async (req, res, next) => {
    const result = await adminService.updateCentre(parseInt(req.params.id), req.body, req.user.id);

    return success(res, 200, 'Centre mis a jour', result);
  }),

  /**
   * PATCH /api/admin/centres/:id/deactivate
   * Deactivate a centre.
   */
  deactivateCentre: catchAsync(async (req, res, next) => {
    const result = await adminService.deactivateCentre(parseInt(req.params.id), req.user.id);

    return success(res, 200, 'Centre desactive', result);
  }),

  reactivateCentre: catchAsync(async (req, res, next) => {
    const result = await adminService.reactivateCentre(parseInt(req.params.id), req.user.id);

    return success(res, 200, 'Centre reactive', result);
  }),

  // ==========================================
  // AUDIT LOG
  // ==========================================

  /**
   * GET /api/admin/audit-log
   * Get audit log entries with filters.
   */
  getAuditLog: catchAsync(async (req, res, next) => {
    const result = await adminService.getAuditLog(req.query);
    return success(res, 200, "Journal d'audit", result);
  }),

  /**
   * GET /api/admin/audit-log/stats
   * Get audit log statistics.
   */
  getAuditStats: catchAsync(async (req, res, next) => {
    const result = await adminService.getAuditStats();
    return success(res, 200, "Statistiques du journal d'audit", result);
  }),

  // ==========================================
  // REFERENCES
  // ==========================================

  /**
   * GET /api/admin/references
   * Return all active centres and vaccines as lightweight id/nom pairs for selectors.
   */
  getReferences: catchAsync(async (req, res, next) => {
    const result = await adminService.getReferences();
    return success(res, 200, 'References actives', result);
  }),

  // ==========================================
  // SYSTEM INFO
  // ==========================================

  /**
   * GET /api/admin/system-info
   * Get system information.
   */
  getSystemInfo: catchAsync(async (req, res, next) => {
    const result = await adminService.getSystemInfo();
    return success(res, 200, 'Informations systeme', result);
  }),
};

module.exports = AdminController;
