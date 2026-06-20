const { getClient, pool } = require('../config/database');
const ApiError = require('../utils/ApiError');
const notificationService = require('./notificationService');

const OPEN_STATUSES = ['EN_FORMATION', 'CONFIRMEE'];

const register = async ({
  parentId,
  sessionId,
  bebeId,
  waitlist = false,
  allowedStatuses = OPEN_STATUSES,
}) => {
  const client = await getClient();
  try {
    await client.query('BEGIN');
    const sessionResult = await client.query('SELECT * FROM session WHERE id = $1 FOR UPDATE', [
      sessionId,
    ]);
    const session = sessionResult.rows[0];
    if (!session) throw ApiError.notFound('Session not found');
    if (!allowedStatuses.includes(session.statut)) {
      throw ApiError.badRequest('Session is not open for registration');
    }

    const bebeResult = await client.query('SELECT id, parent_id FROM bebe WHERE id = $1', [bebeId]);
    const bebe = bebeResult.rows[0];
    if (!bebe) throw ApiError.notFound('Baby not found');
    if (Number(bebe.parent_id) !== Number(parentId)) {
      throw ApiError.forbidden('This baby does not belong to you');
    }

    const duplicate = await client.query(
      "SELECT id FROM rendez_vous WHERE session_id = $1 AND bebe_id = $2 AND statut != 'ANNULE'",
      [sessionId, bebeId],
    );
    if (duplicate.rows[0]) {
      throw ApiError.conflict('This baby already has an appointment for this session');
    }

    const countResult = await client.query(
      "SELECT COUNT(*)::int AS total FROM rendez_vous WHERE session_id = $1 AND statut NOT IN ('ANNULE', 'EN_LISTE_ATTENTE')",
      [sessionId],
    );
    const full = countResult.rows[0].total >= session.max_inscriptions;
    if (waitlist && !full) throw ApiError.badRequest('Session still has available spots');
    if (!waitlist && full) throw ApiError.conflict('Session is full');

    const rdvStatut = waitlist ? 'EN_LISTE_ATTENTE' : 'EN_ATTENTE';
    const result = await client.query(
      'INSERT INTO rendez_vous (session_id, parent_id, bebe_id, statut) VALUES ($1, $2, $3, $4) RETURNING *',
      [sessionId, parentId, bebeId, rdvStatut],
    );

    // Auto-confirm session when all spots are now taken
    let sessionConfirmed = false;
    if (!waitlist) {
      const newCount = countResult.rows[0].total + 1;
      if (newCount >= session.max_inscriptions && session.statut === 'EN_FORMATION') {
        await client.query(
          "UPDATE session SET statut = 'CONFIRMEE', updated_at = NOW() WHERE id = $1",
          [sessionId],
        );
        sessionConfirmed = true;
      }
    }

    await client.query('COMMIT');

    // Notify all participants after commit (non-blocking)
    if (sessionConfirmed) {
      notificationService.sendSessionConfirmee(sessionId, { pool }).catch(() => {});
    }

    return result.rows[0];
  } catch (error) {
    await client.query('ROLLBACK');
    if (error.code === '23505') throw ApiError.conflict('This baby is already registered');
    throw error;
  } finally {
    client.release();
  }
};

module.exports = {
  book: (data) => register(data),
  joinWaitlist: (data) => register({ ...data, waitlist: true }),
};
