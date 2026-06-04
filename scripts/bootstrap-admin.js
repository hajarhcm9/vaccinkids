const bcrypt = require('bcrypt');
const { getClient, pool } = require('../src/config/database');
const { isValidCIN } = require('../src/utils/validator');

const required = (key) => {
  const value = process.env[key];
  if (!value) throw new Error(`${key} is required`);
  return value;
};

async function bootstrapAdmin() {
  const cin = required('BOOTSTRAP_ADMIN_CIN');
  const nom = required('BOOTSTRAP_ADMIN_NOM');
  const prenom = required('BOOTSTRAP_ADMIN_PRENOM');
  const password = required('BOOTSTRAP_ADMIN_PASSWORD');
  const centreId = parseInt(required('BOOTSTRAP_ADMIN_CENTRE_ID'), 10);

  if (!isValidCIN(cin)) throw new Error('BOOTSTRAP_ADMIN_CIN has an invalid format');
  if (
    password.length < 12 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/[0-9]/.test(password) ||
    !/[^a-zA-Z0-9]/.test(password)
  ) {
    throw new Error(
      'BOOTSTRAP_ADMIN_PASSWORD must contain at least 12 characters, upper/lowercase, a number and a symbol',
    );
  }
  if (!Number.isInteger(centreId) || centreId < 1) {
    throw new Error('BOOTSTRAP_ADMIN_CENTRE_ID must be a positive integer');
  }

  const client = await getClient();
  try {
    await client.query('BEGIN');
    const admins = await client.query("SELECT id FROM personnel WHERE role = 'admin' LIMIT 1");
    if (admins.rows.length > 0) {
      throw new Error('An administrator already exists; bootstrap is disabled');
    }

    const centre = await client.query('SELECT id FROM centre WHERE id = $1 AND est_actif = TRUE', [
      centreId,
    ]);
    if (centre.rows.length === 0) throw new Error('Active bootstrap centre not found');

    const hash = await bcrypt.hash(password, 12);
    const result = await client.query(
      `INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif)
       VALUES ($1, $2, $3, $4, 'admin', $5, TRUE)
       RETURNING id, cin, nom, prenom, role, centre_id`,
      [cin, nom, prenom, hash, centreId],
    );
    const admin = result.rows[0];

    await client.query(
      `INSERT INTO audit_log
       (table_name, record_id, action, new_values, user_role)
       VALUES ('personnel', $1, 'INSERT', $2, 'bootstrap')`,
      [admin.id, JSON.stringify({ cin: admin.cin, role: admin.role, centre_id: admin.centre_id })],
    );
    await client.query('COMMIT');
    console.warn(`Initial administrator ${admin.cin} created`);
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}

bootstrapAdmin()
  .catch((error) => {
    console.error('Admin bootstrap failed:', error.message);
    process.exitCode = 1;
  })
  .finally(() => pool.end());
