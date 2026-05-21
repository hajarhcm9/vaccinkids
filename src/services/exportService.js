const { pool } = require('../config/database');
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');

const MONTH_NAMES = [
  'Janvier', 'Fevrier', 'Mars', 'Avril', 'Mai', 'Juin',
  'Juillet', 'Aout', 'Septembre', 'Octobre', 'Novembre', 'Decembre'
];

const generateMonthlyPDF = async function(centreId, month, year) {
  var cId = centreId || null;
  var startDate = new Date(year, month - 1, 1);
  var endDate = new Date(year, month, 1);

  var centreResult;
  if (cId) {
    centreResult = await pool.query(
      'SELECT * FROM centre WHERE id = $1', [cId]
    );
  } else {
    centreResult = await pool.query('SELECT * FROM centre LIMIT 1');
  }
  var centre = centreResult.rows[0] ||
    { nom: 'Centre Es-Salaaam', adresse: 'Oujda', telephone: '' };

  var rdvParams = [startDate, endDate];
  var rdvQuery = 'SELECT rdv.statut, COUNT(*) as count';
  rdvQuery += ' FROM rendez_vous rdv';
  rdvQuery += ' JOIN session s ON rdv.session_id = s.id';
  if (cId) {
    rdvQuery += ' WHERE s.centre_id = $3';
    rdvQuery += ' AND rdv.date_creation >= $1';
    rdvQuery += ' AND rdv.date_creation < $2';
    rdvParams.push(cId);
  } else {
    rdvQuery += ' WHERE rdv.date_creation >= $1';
    rdvQuery += ' AND rdv.date_creation < $2';
  }
  rdvQuery += ' GROUP BY rdv.statut';
  var rdvResult = await pool.query(rdvQuery, rdvParams);

  var rdvStats = {
    total: 0, CONFIRME: 0, EN_ATTENTE: 0, ANNULE: 0, TERMINE: 0
  };
  for (var i = 0; i < rdvResult.rows.length; i++) {
    var row = rdvResult.rows[i];
    rdvStats[row.statut] = parseInt(row.count);
    rdvStats.total += parseInt(row.count);
  }

  var sessParams = [startDate, endDate];
  var sessQuery = 'SELECT s.statut, COUNT(*) as count';
  sessQuery += ' FROM session s';
  sessQuery += ' WHERE s.date_session >= $1';
  sessQuery += ' AND s.date_session < $2';
  if (cId) {
    sessQuery += ' AND s.centre_id = $3';
    sessParams.push(cId);
  }
  sessQuery += ' GROUP BY s.statut';
  var sessResult = await pool.query(sessQuery, sessParams);

  var sessStats = {
    total: 0, TERMINEE: 0, ANNULEE: 0, CONFIRMEE: 0, EN_COURS: 0
  };
  for (var j = 0; j < sessResult.rows.length; j++) {
    var sRow = sessResult.rows[j];
    sessStats[sRow.statut] = parseInt(sRow.count);
    sessStats.total += parseInt(sRow.count);
  }

  return new Promise(function(resolve, reject) {
    try {
      var doc = new PDFDocument({ size: 'A4', margin: 50 });
      var chunks = [];
      doc.on('data', function(chunk) { chunks.push(chunk); });
      doc.on('end', function() {
        resolve(Buffer.concat(chunks));
      });

      doc.fontSize(20).text(
        'Rapport Mensuel', { align: 'center' }
      );
      doc.moveDown(0.5);
      doc.fontSize(14).text(
        centre.nom + ' - ' +
        MONTH_NAMES[month - 1] + ' ' + year,
        { align: 'center' }
      );
      doc.moveDown(0.3);
      doc.fontSize(10).text(
        'Adresse: ' + (centre.adresse || 'N/A'),
        { align: 'center' }
      );
      doc.moveDown(1.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(14).text(
        'Statistiques des Rendez-vous',
        { underline: true }
      );
      doc.moveDown(0.5);
      doc.fontSize(11);
      doc.text('Total: ' + rdvStats.total);
      doc.text('Confirmes: ' + rdvStats.CONFIRME);
      doc.text('En attente: ' + rdvStats.EN_ATTENTE);
      doc.text('Annules: ' + rdvStats.ANNULE);
      doc.text('Termines: ' + rdvStats.TERMINE);
      doc.moveDown(1.5);
      doc.moveTo(50, doc.y).lineTo(545, doc.y).stroke();
      doc.moveDown(0.5);
      doc.fontSize(14).text(
        'Statistiques des Sessions',
        { underline: true }
      );
      doc.moveDown(0.5);
      doc.fontSize(11);
      doc.text('Total: ' + sessStats.total);
      doc.text('Terminees: ' + sessStats.TERMINEE);
      doc.text('Annulees: ' + sessStats.ANNULEE);
      doc.text('Confirmees: ' + sessStats.CONFIRMEE);
      doc.text('En cours: ' + sessStats.EN_COURS);
      doc.end();
    } catch (err) {
      reject(err);
    }
  });
};


const generateExcelExport = async function(centreId, startDate, endDate) {
  var cId = centreId || null;
  var params = [];
  var pIdx = 1;
  var conds = [];

  var query = 'SELECT vc.id, b.nom as bebe_nom,';
  query += ' b.prenom as bebe_prenom, b.date_naissance,';
  query += ' v.nom as vaccin_nom, f.numero_lot, f.fabricant,';
  query += ' p.nom as personnel_nom,';
  query += ' p.prenom as personnel_prenom,';
  query += ' vc.date_heure, vc.poids, vc.taille, vc.reactions';
  query += ' FROM vaccination vc';
  query += ' JOIN rendez_vous rdv ON vc.rendez_vous_id = rdv.id';
  query += ' JOIN bebe b ON rdv.bebe_id = b.id';
  query += ' JOIN session s ON rdv.session_id = s.id';
  query += ' JOIN vaccin v ON s.vaccin_id = v.id';
  query += ' JOIN flacon f ON vc.flacon_id = f.id';
  query += ' JOIN personnel p ON vc.personnel_id = p.id';
  if (startDate) {
    conds.push('vc.date_heure >= $' + pIdx++);
    params.push(new Date(startDate));
  }
  if (endDate) {
    conds.push('vc.date_heure < $' + pIdx++);
    params.push(new Date(endDate));
  }
  if (cId) {
    conds.push('s.centre_id = $' + pIdx++);
    params.push(cId);
  }
  if (conds.length > 0) {
    query += ' WHERE ' + conds.join(' AND ');
  }
  query += ' ORDER BY vc.date_heure';
  var result = await pool.query(query, params);

  var workbook = new ExcelJS.Workbook();
  var sheet = workbook.addWorksheet('Vaccinations');
  sheet.columns = [
    { header: 'ID', key: 'id', width: 5 },
    { header: 'Bebe', key: 'bebe', width: 25 },
    { header: 'Date Naissance', key: 'dnaiss', width: 15 },
    { header: 'Vaccin', key: 'vaccin', width: 20 },
    { header: 'Lot', key: 'lot', width: 15 },
    { header: 'Fabricant', key: 'fab', width: 20 },
    { header: 'Personnel', key: 'perso', width: 25 },
    { header: 'Date Vaccination', key: 'dvc', width: 18 },
    { header: 'Poids (kg)', key: 'poids', width: 12 },
    { header: 'Taille (cm)', key: 'taille', width: 12 },
    { header: 'Reactions', key: 'react', width: 30 }
  ];
  sheet.getRow(1).font = { bold: true };

  for (var i = 0; i < result.rows.length; i++) {
    var r = result.rows[i];
    sheet.addRow({
      id: r.id,
      bebe: r.bebe_nom + ' ' + r.bebe_prenom,
      dnaiss: r.date_naissance ?
        r.date_naissance.toISOString().split('T')[0] : '',
      vaccin: r.vaccin_nom,
      lot: r.numero_lot || '',
      fab: r.fabricant || '',
      perso: r.personnel_nom + ' ' + r.personnel_prenom,
      dvc: r.date_heure ?
        r.date_heure.toISOString().split('T')[0] : '',
      poids: r.poids || '',
      taille: r.taille || '',
      react: r.reactions || ''
    });
  }

  var raw = await workbook.xlsx.writeBuffer();
  var buf = Buffer.isBuffer(raw) ? raw : Buffer.from(raw);
  return buf;
};

module.exports = {
  generateMonthlyPDF,
  generateExcelExport
};
