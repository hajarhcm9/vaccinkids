'use strict';

const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const pool = require('../config/database').pool;
const catchAsync = require('../utils/catchAsync');

function buildVaccinationQuery(filters) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (filters.date_debut) {
    conditions.push('vac.date_heure >= $' + idx);
    params.push(filters.date_debut);
    idx++;
  }
  if (filters.date_fin) {
    conditions.push('vac.date_heure <= $' + idx);
    params.push(filters.date_fin);
    idx++;
  }
  if (filters.centre_id) {
    conditions.push('s.centre_id = $' + idx);
    params.push(parseInt(filters.centre_id));
    idx++;
  }
  const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
  return {
    query: 'SELECT vac.id, vac.date_heure, vac.poids, vac.taille, vac.reactions, ' +
      'b.prenom as bebe_prenom, b.nom as bebe_nom, b.date_naissance, ' +
      'v.nom as vaccin_nom, c.nom as centre_nom, ' +
      'p.nom as personnel_nom, p.prenom as personnel_prenom ' +
      'FROM vaccination vac ' +
      'JOIN rendez_vous rdv ON vac.rendez_vous_id = rdv.id ' +
      'JOIN bebe b ON rdv.bebe_id = b.id ' +
      'JOIN session s ON rdv.session_id = s.id ' +
      'JOIN vaccin v ON s.vaccin_id = v.id ' +
      'JOIN centre c ON s.centre_id = c.id ' +
      'LEFT JOIN personnel p ON vac.personnel_id = p.id ' +
      where + ' ORDER BY vac.date_heure DESC',
    params: params
  };
}

function buildSessionQuery(filters) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (filters.date_debut) {
    conditions.push('s.date_session >= $' + idx);
    params.push(filters.date_debut);
    idx++;
  }
  if (filters.date_fin) {
    conditions.push('s.date_session <= $' + idx);
    params.push(filters.date_fin);
    idx++;
  }
  if (filters.centre_id) {
    conditions.push('s.centre_id = $' + idx);
    params.push(parseInt(filters.centre_id));
    idx++;
  }
  const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
  return {
    query: 'SELECT s.id, s.date_session, s.heure_debut, s.heure_fin, s.statut, ' +
      's.max_inscriptions, v.nom as vaccin_nom, c.nom as centre_nom, ' +
      '(SELECT COUNT(*) FROM rendez_vous rdv WHERE rdv.session_id = s.id) as nb_inscriptions ' +
      'FROM session s ' +
      'JOIN vaccin v ON s.vaccin_id = v.id ' +
      'JOIN centre c ON s.centre_id = c.id ' +
      where + ' ORDER BY s.date_session DESC',
    params: params
  };
}

const exportVaccinationsPdf = catchAsync(async function(req, res) {
  const built = buildVaccinationQuery(req.query);
  const result = await pool.query(built.query, built.params);
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="rapport_vaccinations.pdf"');
  doc.pipe(res);
  doc.fontSize(20).text('Rapport Vaccinations', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text('Date: ' + new Date().toLocaleDateString());
  doc.moveDown();
  result.rows.forEach(function(row) {
    doc.fontSize(10).text(
      row.bebe_prenom + ' ' + row.bebe_nom +
      ' | Vaccin: ' + row.vaccin_nom +
      ' | Date: ' + new Date(row.date_heure).toLocaleDateString() +
      ' | Centre: ' + row.centre_nom
    );
  });
  doc.end();
});

const exportVaccinationsExcel = catchAsync(async function(req, res) {
  const built = buildVaccinationQuery(req.query);
  const result = await pool.query(built.query, built.params);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Vaccinations');
  worksheet.columns = [
    { header: 'Bebe', key: 'bebe' },
    { header: 'Vaccin', key: 'vaccin' },
    { header: 'Date', key: 'date' },
    { header: 'Centre', key: 'centre' },
    { header: 'Poids (kg)', key: 'poids' },
    { header: 'Taille (cm)', key: 'taille' }
  ];
  result.rows.forEach(function(row) {
    worksheet.addRow({
      bebe: row.bebe_prenom + ' ' + row.bebe_nom,
      vaccin: row.vaccin_nom,
      date: new Date(row.date_heure).toLocaleDateString(),
      centre: row.centre_nom,
      poids: row.poids,
      taille: row.taille
    });
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="rapport_vaccinations.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

const exportSessionsPdf = catchAsync(async function(req, res) {
  const built = buildSessionQuery(req.query);
  const result = await pool.query(built.query, built.params);
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="rapport_sessions.pdf"');
  doc.pipe(res);
  doc.fontSize(20).text('Rapport Sessions', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text('Date: ' + new Date().toLocaleDateString());
  doc.moveDown();
  result.rows.forEach(function(row) {
    doc.fontSize(10).text(
      'Session: ' + row.vaccin_nom +
      ' | Date: ' + new Date(row.date_session).toLocaleDateString() +
      ' | Centre: ' + row.centre_nom +
      ' | Statut: ' + row.statut +
      ' | Inscriptions: ' + row.nb_inscriptions + '/' + row.max_inscriptions
    );
  });
  doc.end();
});

const exportSessionsExcel = catchAsync(async function(req, res) {
  const built = buildSessionQuery(req.query);
  const result = await pool.query(built.query, built.params);
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Sessions');
  worksheet.columns = [
    { header: 'Vaccin', key: 'vaccin' },
    { header: 'Date', key: 'date' },
    { header: 'Centre', key: 'centre' },
    { header: 'Statut', key: 'statut' },
    { header: 'Inscriptions', key: 'inscriptions' }
  ];
  result.rows.forEach(function(row) {
    worksheet.addRow({
      vaccin: row.vaccin_nom,
      date: new Date(row.date_session).toLocaleDateString(),
      centre: row.centre_nom,
      statut: row.statut,
      inscriptions: row.nb_inscriptions + '/' + row.max_inscriptions
    });
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="rapport_sessions.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

const exportAbsenteismePdf = catchAsync(async function(req, res) {
  const result = await pool.query(
    'SELECT p.id, p.nom, p.prenom, p.telephone, p.nb_absences_consecutives ' +
    'FROM parent p WHERE p.nb_absences_consecutives > 0 ORDER BY p.nb_absences_consecutives DESC'
  );
  const doc = new PDFDocument();
  res.setHeader('Content-Type', 'application/pdf');
  res.setHeader('Content-Disposition', 'attachment; filename="rapport_absenteisme.pdf"');
  doc.pipe(res);
  doc.fontSize(20).text('Rapport Absenteisme', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text('Date: ' + new Date().toLocaleDateString());
  doc.moveDown();
  result.rows.forEach(function(row) {
    doc.fontSize(10).text(
      row.prenom + ' ' + row.nom +
      ' | Tel: ' + row.telephone +
      ' | Absences consecutives: ' + row.nb_absences_consecutives
    );
  });
  doc.end();
});

const exportAbsenteismeExcel = catchAsync(async function(req, res) {
  const result = await pool.query(
    'SELECT p.id, p.nom, p.prenom, p.telephone, p.nb_absences_consecutives ' +
    'FROM parent p WHERE p.nb_absences_consecutives > 0 ORDER BY p.nb_absences_consecutives DESC'
  );
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Absenteisme');
  worksheet.columns = [
    { header: 'Nom', key: 'nom' },
    { header: 'Prenom', key: 'prenom' },
    { header: 'Telephone', key: 'telephone' },
    { header: 'Absences consecutives', key: 'absences' }
  ];
  result.rows.forEach(function(row) {
    worksheet.addRow({
      nom: row.nom,
      prenom: row.prenom,
      telephone: row.telephone,
      absences: row.nb_absences_consecutives
    });
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="rapport_absenteisme.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

const exportStockExcel = catchAsync(async function(req, res) {
  const conditions = [];
  const params = [];
  let idx = 1;
  if (req.query.centre_id) {
    conditions.push('st.centre_id = $' + idx);
    params.push(parseInt(req.query.centre_id));
    idx++;
  }
  const where = conditions.length > 0 ? ' WHERE ' + conditions.join(' AND ') : '';
  const result = await pool.query(
    'SELECT st.id, st.quantite_disponible, st.seuil_alerte, ' +
    'v.nom as vaccin_nom, c.nom as centre_nom ' +
    'FROM stock st ' +
    'JOIN vaccin v ON st.vaccin_id = v.id ' +
    'JOIN centre c ON st.centre_id = c.id ' +
    where + ' ORDER BY c.nom, v.nom',
    params
  );
  const workbook = new ExcelJS.Workbook();
  const worksheet = workbook.addWorksheet('Stock');
  worksheet.columns = [
    { header: 'Centre', key: 'centre' },
    { header: 'Vaccin', key: 'vaccin' },
    { header: 'Quantite', key: 'quantite' },
    { header: 'Seuil alerte', key: 'seuil' }
  ];
  result.rows.forEach(function(row) {
    worksheet.addRow({
      centre: row.centre_nom,
      vaccin: row.vaccin_nom,
      quantite: row.quantite_disponible,
      seuil: row.seuil_alerte
    });
  });
  res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
  res.setHeader('Content-Disposition', 'attachment; filename="rapport_stock.xlsx"');
  await workbook.xlsx.write(res);
  res.end();
});

module.exports = {
  exportVaccinationsPdf,
  exportVaccinationsExcel,
  exportSessionsPdf,
  exportSessionsExcel,
  exportAbsenteismePdf,
  exportAbsenteismeExcel,
  exportStockExcel
};
