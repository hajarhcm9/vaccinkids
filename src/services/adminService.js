const { pool } = require('../config/database');
const bcrypt = require('bcrypt');

const VALID_SYSTEM_INFO_TABLES = [
  'centre',
  'personnel',
  'parent',
  'bebe',
  'vaccin',
  'session',
  'rendez_vous',
  'vaccination',
  'stock',
  'flacon',
  'croissance',
  'audit_log',
  'notification',
  'file_attente',
  'sync_queue',
  'otp_codes',
  'refresh_tokens',
];

const tableIdentifier = function (table) {
  if (!VALID_SYSTEM_INFO_TABLES.includes(table)) {
    throw new Error('Invalid table name: ' + table);
  }
  return table === 'session' ? '"session"' : table;
};

/**
 * AdminService - Personnel, Centres, Audit Log management
 * All SQL uses string concatenation (no template literals).
 */
class AdminService {
  // ==========================================
  // PERSONNEL MANAGEMENT
  // ==========================================

  async createPersonnel(data, adminId) {
    var cin = data.cin;
    var nom = data.nom;
    var prenom = data.prenom;
    var mot_de_passe = data.mot_de_passe;
    var role = data.role;
    var centre_id = data.centre_id;

    // Check CIN uniqueness
    var existing = await pool.query('SELECT id FROM personnel WHERE cin = $1', [cin]);
    if (existing.rows.length > 0) {
      return { error: 'Un personnel avec ce CIN existe deja' };
    }

    // Validate centre
    var centreRes = await pool.query('SELECT id FROM centre WHERE id = $1 AND est_actif = TRUE', [
      centre_id,
    ]);
    if (centreRes.rows.length === 0) {
      return { error: 'Centre non trouve ou inactif' };
    }

    // Validate role
    if (!['admin', 'infirmier'].includes(role)) {
      return { error: 'Role invalide. Utilisez: admin ou infirmier' };
    }

    var hash = await bcrypt.hash(mot_de_passe, 10);
    var res = await pool.query(
      'INSERT INTO personnel (cin, nom, prenom, mot_de_passe, role, centre_id, est_actif) VALUES ($1, $2, $3, $4, $5, $6, TRUE) RETURNING id, cin, nom, prenom, role, centre_id, est_actif, created_at',
      [cin, nom, prenom, hash, role, centre_id],
    );
    var personnel = res.rows[0];

    // Audit log (non-blocking)
    try {
      await pool.query(
        'INSERT INTO audit_log (table_name, record_id, action, new_values, user_id, user_role) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          'personnel',
          personnel.id,
          'INSERT',
          JSON.stringify({ cin: cin, nom: nom, prenom: prenom, role: role, centre_id: centre_id }),
          adminId,
          'admin',
        ],
      );
    } catch (e) {
      /* non-blocking */
    }

    return { personnel: personnel };
  }

  async getPersonnel(filters) {
    if (!filters) filters = {};
    var role = filters.role;
    var centre_id = filters.centre_id;
    var est_actif = filters.est_actif;
    var search = filters.search;
    var page = parseInt(filters.page) || 1;
    var limit = parseInt(filters.limit) || 20;
    var offset = (page - 1) * limit;

    var conditions = [];
    var params = [];
    var idx = 1;

    if (role) {
      conditions.push('p.role = $' + idx);
      params.push(role);
      idx++;
    }
    if (centre_id) {
      conditions.push('p.centre_id = $' + idx);
      params.push(parseInt(centre_id));
      idx++;
    }
    if (est_actif !== undefined && est_actif !== null && est_actif !== '') {
      conditions.push('p.est_actif = $' + idx);
      params.push(est_actif === 'true' || est_actif === true);
      idx++;
    }
    if (search) {
      conditions.push(
        '(p.nom ILIKE $' + idx + ' OR p.prenom ILIKE $' + idx + ' OR p.cin ILIKE $' + idx + ')',
      );
      params.push('%' + search + '%');
      idx++;
    }

    var whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

    // Count
    var countSQL = 'SELECT COUNT(*) AS total FROM personnel p' + whereClause;
    var countRes = await pool.query(countSQL, params);
    var total = parseInt(countRes.rows[0].total) || 0;

    // Data with centre name
    var dataSQL =
      'SELECT p.id, p.cin, p.nom, p.prenom, p.role, p.centre_id, p.est_actif, p.created_at, p.updated_at, c.nom AS centre_nom' +
      ' FROM personnel p' +
      ' LEFT JOIN centre c ON c.id = p.centre_id' +
      whereClause +
      ' ORDER BY p.nom ASC, p.prenom ASC' +
      ' LIMIT $' +
      idx +
      ' OFFSET $' +
      (idx + 1);

    var dataRes = await pool.query(dataSQL, params.concat([limit, offset]));

    return {
      personnel: dataRes.rows,
      total: total,
      page: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getPersonnelById(id) {
    var sql =
      'SELECT p.id, p.cin, p.nom, p.prenom, p.role, p.centre_id, p.est_actif, p.created_at, p.updated_at, c.nom AS centre_nom, c.adresse AS centre_adresse' +
      ' FROM personnel p' +
      ' LEFT JOIN centre c ON c.id = p.centre_id' +
      ' WHERE p.id = $1';
    var res = await pool.query(sql, [id]);
    return res.rows[0] || null;
  }

  async updatePersonnel(id, data, adminId) {
    var existing = await pool.query('SELECT * FROM personnel WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return { error: 'Personnel non trouve' };
    }

    var old = existing.rows[0];
    var updates = [];
    var values = [];
    var idx = 1;

    var allowedFields = ['nom', 'prenom', 'role', 'centre_id', 'est_actif'];
    for (var i = 0; i < allowedFields.length; i++) {
      var field = allowedFields[i];
      if (data[field] !== undefined) {
        if (field === 'role' && !['admin', 'infirmier'].includes(data[field])) {
          return { error: 'Role invalide' };
        }
        if (field === 'centre_id') {
          var cRes = await pool.query('SELECT id FROM centre WHERE id = $1 AND est_actif = TRUE', [
            data[field],
          ]);
          if (cRes.rows.length === 0) {
            return { error: 'Centre non trouve ou inactif' };
          }
        }
        updates.push(field + ' = $' + idx);
        values.push(data[field]);
        idx++;
      }
    }

    if (data.mot_de_passe) {
      var hash = await bcrypt.hash(data.mot_de_passe, 10);
      updates.push('mot_de_passe = $' + idx);
      values.push(hash);
      idx++;
    }

    if (updates.length === 0) {
      return { error: 'Aucune donnee a mettre a jour' };
    }

    values.push(id);

    var sql =
      'UPDATE personnel SET ' +
      updates.join(', ') +
      ' WHERE id = $' +
      idx +
      ' RETURNING id, cin, nom, prenom, role, centre_id, est_actif, updated_at';
    var res = await pool.query(sql, values);

    // Audit log (non-blocking)
    try {
      await pool.query(
        'INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, user_id, user_role) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          'personnel',
          id,
          'UPDATE',
          JSON.stringify({ nom: old.nom, role: old.role, est_actif: old.est_actif }),
          JSON.stringify(data),
          adminId,
          'admin',
        ],
      );
    } catch (e) {
      /* non-blocking */
    }

    return { personnel: res.rows[0] };
  }

  async deactivatePersonnel(id, adminId) {
    var existing = await pool.query('SELECT id, est_actif FROM personnel WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return { error: 'Personnel non trouve' };
    }
    if (!existing.rows[0].est_actif) {
      return { error: 'Personnel deja desactive' };
    }
    if (parseInt(id) === parseInt(adminId)) {
      return { error: 'Vous ne pouvez pas desactiver votre propre compte' };
    }

    await pool.query('UPDATE personnel SET est_actif = FALSE WHERE id = $1', [id]);

    try {
      await pool.query(
        'INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, user_id, user_role) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          'personnel',
          id,
          'UPDATE',
          JSON.stringify({ est_actif: true }),
          JSON.stringify({ est_actif: false }),
          adminId,
          'admin',
        ],
      );
    } catch (e) {
      /* non-blocking */
    }

    return { deactivated: true, id: id };
  }

  async reactivatePersonnel(id, adminId) {
    var existing = await pool.query('SELECT id, est_actif FROM personnel WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return { error: 'Personnel non trouve' };
    }
    if (existing.rows[0].est_actif) {
      return { error: 'Personnel deja actif' };
    }

    await pool.query('UPDATE personnel SET est_actif = TRUE WHERE id = $1', [id]);

    try {
      await pool.query(
        'INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, user_id, user_role) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          'personnel',
          id,
          'UPDATE',
          JSON.stringify({ est_actif: false }),
          JSON.stringify({ est_actif: true }),
          adminId,
          'admin',
        ],
      );
    } catch (e) {
      /* non-blocking */
    }

    return { reactivated: true, id: id };
  }

  // ==========================================
  // CENTRE MANAGEMENT
  // ==========================================

  async createCentre(data, adminId) {
    var nom = data.nom;
    var adresse = data.adresse;
    var telephone = data.telephone;
    var gps_lat = data.gps_lat || null;
    var gps_lng = data.gps_lng || null;

    if (!nom || !adresse || !telephone) {
      return { error: 'Nom, adresse et telephone sont obligatoires' };
    }

    var res = await pool.query(
      'INSERT INTO centre (nom, adresse, telephone, gps_lat, gps_lng, est_actif) VALUES ($1, $2, $3, $4, $5, TRUE) RETURNING id, nom, adresse, telephone, gps_lat, gps_lng, est_actif, created_at',
      [nom, adresse, telephone, gps_lat, gps_lng],
    );
    var centre = res.rows[0];

    try {
      await pool.query(
        'INSERT INTO audit_log (table_name, record_id, action, new_values, user_id, user_role) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          'centre',
          centre.id,
          'INSERT',
          JSON.stringify({ nom: nom, adresse: adresse, telephone: telephone }),
          adminId,
          'admin',
        ],
      );
    } catch (e) {
      /* non-blocking */
    }

    return { centre: centre };
  }

  async getCentres(filters) {
    if (!filters) filters = {};
    var est_actif = filters.est_actif;
    var search = filters.search;
    var page = parseInt(filters.page) || 1;
    var limit = parseInt(filters.limit) || 20;
    var offset = (page - 1) * limit;

    var conditions = [];
    var params = [];
    var idx = 1;

    if (est_actif !== undefined && est_actif !== null && est_actif !== '') {
      conditions.push('c.est_actif = $' + idx);
      params.push(est_actif === 'true' || est_actif === true);
      idx++;
    }
    if (search) {
      conditions.push('(c.nom ILIKE $' + idx + ' OR c.adresse ILIKE $' + idx + ')');
      params.push('%' + search + '%');
      idx++;
    }

    var whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

    // Count
    var countSQL = 'SELECT COUNT(*) AS total FROM centre c' + whereClause;
    var countRes = await pool.query(countSQL, params);
    var total = parseInt(countRes.rows[0].total) || 0;

    // Data with subquery stats
    var dataSQL =
      'SELECT c.id, c.nom, c.adresse, c.telephone, c.gps_lat, c.gps_lng, c.est_actif, c.created_at, c.updated_at,' +
      ' (SELECT COUNT(*) FROM personnel p WHERE p.centre_id = c.id AND p.est_actif = TRUE) AS nb_personnel,' +
      ' (SELECT COUNT(*) FROM session s WHERE s.centre_id = c.id) AS nb_sessions,' +
      ' (SELECT COUNT(*) FROM stock st WHERE st.centre_id = c.id AND st.quantite_disponible <= st.seuil_alerte) AS alertes_stock' +
      ' FROM centre c' +
      whereClause +
      ' ORDER BY c.nom ASC' +
      ' LIMIT $' +
      idx +
      ' OFFSET $' +
      (idx + 1);

    var dataRes = await pool.query(dataSQL, params.concat([limit, offset]));

    return {
      centres: dataRes.rows,
      total: total,
      page: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getCentreById(id) {
    var sql =
      'SELECT c.id, c.nom, c.adresse, c.telephone, c.gps_lat, c.gps_lng, c.est_actif, c.created_at, c.updated_at,' +
      ' (SELECT COUNT(*) FROM personnel p WHERE p.centre_id = c.id AND p.est_actif = TRUE) AS nb_personnel,' +
      ' (SELECT COUNT(*) FROM session s WHERE s.centre_id = c.id) AS nb_sessions,' +
      ' (SELECT COUNT(*) FROM stock st WHERE st.centre_id = c.id AND st.quantite_disponible <= st.seuil_alerte) AS alertes_stock' +
      ' FROM centre c' +
      ' WHERE c.id = $1';
    var res = await pool.query(sql, [id]);
    return res.rows[0] || null;
  }

  async updateCentre(id, data, adminId) {
    var existing = await pool.query('SELECT * FROM centre WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return { error: 'Centre non trouve' };
    }

    var old = existing.rows[0];
    var updates = [];
    var values = [];
    var idx = 1;

    var allowedFields = ['nom', 'adresse', 'telephone', 'gps_lat', 'gps_lng', 'est_actif'];
    for (var i = 0; i < allowedFields.length; i++) {
      var field = allowedFields[i];
      if (data[field] !== undefined) {
        updates.push(field + ' = $' + idx);
        values.push(data[field]);
        idx++;
      }
    }

    if (updates.length === 0) {
      return { error: 'Aucune donnee a mettre a jour' };
    }

    values.push(id);

    var sql =
      'UPDATE centre SET ' +
      updates.join(', ') +
      ' WHERE id = $' +
      idx +
      ' RETURNING id, nom, adresse, telephone, gps_lat, gps_lng, est_actif, updated_at';
    var res = await pool.query(sql, values);

    try {
      await pool.query(
        'INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, user_id, user_role) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          'centre',
          id,
          'UPDATE',
          JSON.stringify({ nom: old.nom, adresse: old.adresse }),
          JSON.stringify(data),
          adminId,
          'admin',
        ],
      );
    } catch (e) {
      /* non-blocking */
    }

    return { centre: res.rows[0] };
  }

  async deactivateCentre(id, adminId) {
    var existing = await pool.query('SELECT id, est_actif FROM centre WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return { error: 'Centre non trouve' };
    }
    if (!existing.rows[0].est_actif) {
      return { error: 'Centre deja desactive' };
    }

    var personnelRes = await pool.query(
      'SELECT COUNT(*) AS total FROM personnel WHERE centre_id = $1 AND est_actif = TRUE',
      [id],
    );
    if (parseInt(personnelRes.rows[0].total) > 0) {
      return {
        error:
          "Impossible de desactiver un centre avec du personnel actif. Desactivez le personnel d'abord.",
      };
    }

    var activeSessionsRes = await pool.query(
      "SELECT COUNT(*) AS total FROM session WHERE centre_id = $1 AND statut IN ('EN_FORMATION', 'PLANIFIEE', 'CONFIRMEE', 'EN_COURS')",
      [id],
    );
    if (parseInt(activeSessionsRes.rows[0].total) > 0) {
      return { error: 'Impossible de desactiver un centre avec des sessions actives' };
    }

    await pool.query('UPDATE centre SET est_actif = FALSE WHERE id = $1', [id]);

    try {
      await pool.query(
        'INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, user_id, user_role) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          'centre',
          id,
          'UPDATE',
          JSON.stringify({ est_actif: true }),
          JSON.stringify({ est_actif: false }),
          adminId,
          'admin',
        ],
      );
    } catch (e) {
      /* non-blocking */
    }

    return { deactivated: true, id: id };
  }

  async reactivateCentre(id, adminId) {
    var existing = await pool.query('SELECT id, est_actif FROM centre WHERE id = $1', [id]);
    if (existing.rows.length === 0) {
      return { error: 'Centre non trouve' };
    }
    if (existing.rows[0].est_actif) {
      return { error: 'Centre deja actif' };
    }

    await pool.query('UPDATE centre SET est_actif = TRUE WHERE id = $1', [id]);
    try {
      await pool.query(
        'INSERT INTO audit_log (table_name, record_id, action, old_values, new_values, user_id, user_role) VALUES ($1, $2, $3, $4, $5, $6)',
        [
          'centre',
          id,
          'UPDATE',
          JSON.stringify({ est_actif: false }),
          JSON.stringify({ est_actif: true }),
          adminId,
          'admin',
        ],
      );
    } catch (e) {
      /* non-blocking */
    }

    return { reactivated: true, id: id };
  }

  // ==========================================
  // AUDIT LOG
  // ==========================================

  async getAuditLog(filters) {
    if (!filters) filters = {};
    var table_name = filters.table_name;
    var action = filters.action;
    var user_id = filters.user_id;
    var date_debut = filters.date_debut;
    var date_fin = filters.date_fin;
    var search = filters.search;
    var page = parseInt(filters.page) || 1;
    var limit = parseInt(filters.limit) || 50;
    var offset = (page - 1) * limit;

    var conditions = [];
    var params = [];
    var idx = 1;

    if (table_name) {
      conditions.push('a.table_name = $' + idx);
      params.push(table_name);
      idx++;
    }
    if (action) {
      conditions.push('a.action = $' + idx);
      params.push(action);
      idx++;
    }
    if (user_id) {
      conditions.push('a.user_id = $' + idx);
      params.push(parseInt(user_id));
      idx++;
    }
    if (date_debut) {
      conditions.push('a.timestamp >= $' + idx);
      params.push(date_debut);
      idx++;
    }
    if (date_fin) {
      conditions.push('a.timestamp <= $' + idx);
      params.push(date_fin);
      idx++;
    }
    if (search) {
      conditions.push(
        '(a.old_values::text ILIKE $' + idx + ' OR a.new_values::text ILIKE $' + idx + ')',
      );
      params.push('%' + search + '%');
      idx++;
    }

    var whereClause = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';

    // Count
    var countSQL = 'SELECT COUNT(*) AS total FROM audit_log a' + whereClause;
    var countRes = await pool.query(countSQL, params);
    var total = parseInt(countRes.rows[0].total) || 0;

    // Data
    var dataSQL =
      'SELECT a.id, a.table_name, a.record_id, a.action, a.old_values, a.new_values, a.user_id, a.user_role, a.timestamp' +
      ' FROM audit_log a' +
      whereClause +
      ' ORDER BY a.timestamp DESC' +
      ' LIMIT $' +
      idx +
      ' OFFSET $' +
      (idx + 1);

    var dataRes = await pool.query(dataSQL, params.concat([limit, offset]));

    return {
      entries: dataRes.rows,
      total: total,
      page: page,
      totalPages: Math.ceil(total / limit),
    };
  }

  async getAuditStats() {
    var totalRes = await pool.query('SELECT COUNT(*) AS total FROM audit_log');
    var actionRes = await pool.query(
      'SELECT action, COUNT(*) AS nb FROM audit_log GROUP BY action ORDER BY nb DESC',
    );
    var tableRes = await pool.query(
      'SELECT table_name, COUNT(*) AS nb FROM audit_log GROUP BY table_name ORDER BY nb DESC',
    );
    var recentRes = await pool.query(
      "SELECT COUNT(*) AS nb FROM audit_log WHERE timestamp >= NOW() - INTERVAL '24 hours'",
    );
    var dailyRes = await pool.query(
      "SELECT DATE(timestamp) AS jour, COUNT(*) AS nb FROM audit_log WHERE timestamp >= NOW() - INTERVAL '7 days' GROUP BY DATE(timestamp) ORDER BY jour DESC",
    );

    return {
      totalEntries: parseInt(totalRes.rows[0].total) || 0,
      byAction: actionRes.rows,
      byTable: tableRes.rows,
      activiteRecente24h: parseInt(recentRes.rows[0].nb) || 0,
      activiteQuotidienne: dailyRes.rows,
    };
  }

  // ==========================================
  // REFERENCES (lightweight selectors)
  // ==========================================

  async getReferences() {
    var centreRes = await pool.query(
      'SELECT id, nom FROM centre WHERE est_actif = TRUE ORDER BY nom',
    );
    var vaccinRes = await pool.query(
      'SELECT id, nom FROM vaccin WHERE est_actif = TRUE ORDER BY nom',
    );
    return {
      centres: centreRes.rows,
      vaccins: vaccinRes.rows,
    };
  }

  // ==========================================
  // SYSTEM INFO
  // ==========================================

  async getSystemInfo() {
    var dbSizeRes = await pool.query(
      'SELECT pg_size_pretty(pg_database_size(current_database())) AS db_size',
    );

    var tables = [
      'centre',
      'personnel',
      'parent',
      'bebe',
      'vaccin',
      'session',
      'rendez_vous',
      'vaccination',
      'stock',
      'flacon',
      'audit_log',
      'notification',
      'file_attente',
      'sync_queue',
    ];
    var counts = {};
    for (var i = 0; i < tables.length; i++) {
      try {
        var r = await pool.query('SELECT COUNT(*) AS total FROM ' + tableIdentifier(tables[i]));
        counts[tables[i]] = parseInt(r.rows[0].total) || 0;
      } catch (e) {
        counts[tables[i]] = 0;
      }
    }

    var activePersonnel = await pool.query(
      'SELECT COUNT(*) AS total FROM personnel WHERE est_actif = TRUE',
    );
    var uptimeRes = await pool.query('SELECT NOW() - pg_postmaster_start_time() AS uptime');

    return {
      dbSize: dbSizeRes.rows[0].db_size || 'unknown',
      tableCounts: counts,
      activePersonnel: parseInt(activePersonnel.rows[0].total) || 0,
      dbUptime: uptimeRes.rows[0].uptime || 'unknown',
    };
  }
}

module.exports = new AdminService();
