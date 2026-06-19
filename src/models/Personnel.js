const { query } = require('../config/database');

const Personnel = {
  async create(data) {
    const { cin, nom, prenom, mot_de_passe, role, centre_id } = data;
    const result = await query(
      `INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id)
       VALUES ($1, $2, $3, $4, $5, $6) RETURNING id, cin, nom, prenom, role, centre_id, est_actif, created_at`,
      [cin, nom, prenom, mot_de_passe, role, centre_id],
    );
    return result.rows[0];
  },

  async findById(id) {
    const result = await query(
      'SELECT p.id, p.cin, p.nom, p.prenom, p.role, p.centre_id, c.nom AS centre_nom, p.est_actif, p.created_at FROM personnel p LEFT JOIN centres c ON c.id = p.centre_id WHERE p.id = $1',
      [id],
    );
    return result.rows[0];
  },

  async findByIdWithPassword(id) {
    const result = await query('SELECT * FROM personnel WHERE id = $1', [id]);
    return result.rows[0];
  },

  async findByCIN(cin) {
    const result = await query('SELECT * FROM personnel WHERE cin = $1', [cin]);
    return result.rows[0];
  },

  async findByCentre(centreId) {
    const result = await query(
      'SELECT id, cin, nom, prenom, role, est_actif FROM personnel WHERE centre_id = $1 ORDER BY nom',
      [centreId],
    );
    return result.rows;
  },

  async findAll() {
    const result = await query(
      'SELECT id, cin, nom, prenom, role, centre_id, est_actif FROM personnel ORDER BY nom',
    );
    return result.rows;
  },

  async update(id, data) {
    const fields = [];
    const values = [id];
    let paramIndex = 2;
    const allowedFields = ['nom', 'prenom', 'mot_de_passe', 'role', 'centre_id', 'est_actif'];
    for (const field of allowedFields) {
      if (data[field] !== undefined) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(data[field]);
        paramIndex++;
      }
    }
    if (fields.length === 0) return null;
    const result = await query(
      `UPDATE personnel SET ${fields.join(', ')} WHERE id = $1 RETURNING id, cin, nom, prenom, role, centre_id, est_actif`,
      values,
    );
    return result.rows[0];
  },

  async deactivate(id) {
    const result = await query(
      'UPDATE personnel SET est_actif = FALSE WHERE id = $1 RETURNING id, cin, nom, prenom, role, est_actif',
      [id],
    );
    return result.rows[0];
  },
};

module.exports = Personnel;
