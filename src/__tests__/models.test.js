const { query } = require('../config/database');
const Session = require('../models/Session');
const Flacon = require('../models/Flacon');
const RendezVous = require('../models/RendezVous');

jest.mock('../config/database', () => ({
  query: jest.fn(),
}));

describe('Session model', () => {
  beforeEach(() => {
    query.mockReset();
  });

  test('findAll applies optional filters', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 1 }] });

    const sessions = await Session.findAll({
      centreId: 2,
      vaccinId: 3,
      dateSession: '2026-04-29',
    });

    expect(sessions).toEqual([{ id: 1 }]);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining(
        'WHERE s.centre_id = $1 AND s.vaccin_id = $2 AND s.date_session = $3',
      ),
      [2, 3, '2026-04-29'],
    );
  });
});

describe('Flacon model', () => {
  beforeEach(() => {
    query.mockReset();
  });

  test('isEmpty returns true when used and wasted doses reach vial capacity', async () => {
    query.mockResolvedValueOnce({
      rows: [{ doses_utilisees: 7, doses_gaspillees: 3, doses_par_flacon: 10 }],
    });

    await expect(Flacon.isEmpty(12)).resolves.toBe(true);
  });

  test('isEmpty returns null for unknown vial', async () => {
    query.mockResolvedValueOnce({ rows: [] });

    await expect(Flacon.isEmpty(99)).resolves.toBeNull();
  });

  test('openFlacon persists forced opening justification', async () => {
    query.mockResolvedValueOnce({ rows: [{ id: 8, ouverture_forcee: true }] });

    await expect(Flacon.openFlacon(8, true, 'Cold chain break')).resolves.toEqual({
      id: 8,
      ouverture_forcee: true,
    });
    expect(query).toHaveBeenCalledWith(
      'UPDATE flacon SET ouverture_forcee = TRUE, justification_forcee = $2 WHERE id = $1 RETURNING *',
      [8, 'Cold chain break'],
    );
  });
});

describe('RendezVous model', () => {
  beforeEach(() => {
    query.mockReset();
  });

  test('create maps duplicate baby registration to a conflict error', async () => {
    const duplicateError = new Error('duplicate key value violates unique constraint');
    duplicateError.code = '23505';
    query.mockRejectedValueOnce(duplicateError);

    await expect(
      RendezVous.create({ session_id: 1, parent_id: 2, bebe_id: 3 }),
    ).rejects.toMatchObject({
      statusCode: 409,
      message: 'Ce bébé est déjà inscrit à cette session',
    });
  });

  test('countActiveBySession excludes cancelled appointments', async () => {
    query.mockResolvedValueOnce({ rows: [{ actifs: 4 }] });

    await expect(RendezVous.countActiveBySession(1)).resolves.toBe(4);
    expect(query).toHaveBeenCalledWith(
      expect.stringContaining('FROM rendez_vous WHERE session_id = $1'),
      [1],
    );
  });
});
