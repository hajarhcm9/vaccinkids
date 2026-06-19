const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');
const { pool } = require('../config/database');
const { safeSpreadsheetValue, sanitizeWorksheet } = require('../utils/spreadsheet');

function _bq(base, fl) {
  var p = [];
  var i = 1;
  var s = base;
  var cc = fl.centreCol || 's.centre_id';
  if (fl.centreId) {
    s += ' AND ' + cc + ' = $' + i++;
    p.push(fl.centreId);
  }
  if (fl.dateDebut) {
    s += ' AND ' + fl.dateCol + ' >= $' + i++;
    p.push(fl.dateDebut);
  }
  if (fl.dateFin) {
    s += ' AND ' + fl.dateCol + ' <= $' + i++;
    p.push(fl.dateFin);
  }
  if (fl.groupBy) {
    s += ' GROUP BY ' + fl.groupBy;
  }
  s += ' ORDER BY ' + fl.orderBy;
  return { sql: s, params: p };
}

function _pdf(title, cols, hdrs, rows) {
  return new Promise(function (resolve, reject) {
    var doc = new PDFDocument();
    var buffers = [];
    doc.on('data', function (b) {
      buffers.push(b);
    });
    doc.on('end', function () {
      resolve(Buffer.concat(buffers));
    });
    doc.on('error', reject);
    doc.fontSize(18).text(title, { align: 'center' });
    doc.moveDown();
    if (rows.length === 0) {
      doc.fontSize(12).text('Aucune donnee');
    } else {
      rows.forEach(function (r) {
        var line = cols
          .map(function (c) {
            return r[c] != null ? String(r[c]) : 'N/A';
          })
          .join(' | ');
        doc.fontSize(9).text(line);
      });
    }
    doc.end();
  });
}

async function _xls(name, hdrs, cols, rows) {
  var wb = new ExcelJS.Workbook();
  var ws = wb.addWorksheet(name);
  ws.columns = hdrs.map(function (h, i) {
    return { header: h, key: cols[i] };
  });
  rows.forEach(function (r) {
    var safeRow = Object.fromEntries(
      Object.entries(r).map(function (entry) {
        return [entry[0], safeSpreadsheetValue(entry[1])];
      }),
    );
    ws.addRow(safeRow);
  });
  sanitizeWorksheet(ws);
  var buf = await wb.xlsx.writeBuffer();
  return Buffer.from(buf);
}

var VS =
  'SELECT vc.date_heure,b.nom as bebe_nom,b.prenom as bebe_prenom,v.nom as vaccin_nom,f.numero_lot,p.nom as personnel_nom,c.nom as centre_nom FROM vaccination vc JOIN rendez_vous rdv ON vc.rendez_vous_id=rdv.id JOIN bebe b ON rdv.bebe_id=b.id JOIN session s ON rdv.session_id=s.id JOIN vaccin v ON s.vaccin_id=v.id LEFT JOIN flacon f ON vc.flacon_id=f.id LEFT JOIN personnel p ON vc.personnel_id=p.id LEFT JOIN centre c ON s.centre_id=c.id WHERE 1=1';
var VC = [
  'date_heure',
  'bebe_nom',
  'bebe_prenom',
  'vaccin_nom',
  'numero_lot',
  'personnel_nom',
  'centre_nom',
];
var VH = ['Date', 'Bebe', 'Prenom', 'Vaccin', 'Lot', 'Personnel', 'Centre'];

async function generateVaccinationsPDF(ci, dd, df) {
  var q = _bq(VS, {
    centreId: ci,
    dateDebut: dd,
    dateFin: df,
    dateCol: 'vc.date_heure',
    orderBy: 'vc.date_heure DESC',
  });
  var r = await pool.query(q.sql, q.params);
  return _pdf('Export Vaccinations', VC, VH, r.rows);
}
async function generateVaccinationsExcel(ci, dd, df) {
  var q = _bq(VS, {
    centreId: ci,
    dateDebut: dd,
    dateFin: df,
    dateCol: 'vc.date_heure',
    orderBy: 'vc.date_heure DESC',
  });
  var r = await pool.query(q.sql, q.params);
  return _xls('Vaccinations', VH, VC, r.rows);
}

var SS =
  'SELECT s.date_session,v.nom as vaccin_nom,c.nom as centre_nom,s.statut,s.max_inscriptions,COUNT(r.id) as nb_rdv FROM session s JOIN vaccin v ON s.vaccin_id=v.id LEFT JOIN centre c ON s.centre_id=c.id LEFT JOIN rendez_vous r ON r.session_id=s.id WHERE 1=1';
var SC = ['date_session', 'vaccin_nom', 'centre_nom', 'statut', 'max_inscriptions', 'nb_rdv'];
var SH = ['Date Session', 'Vaccin', 'Centre', 'Statut', 'Max Inscriptions', 'Nb RDV'];
async function generateSessionsPDF(ci, dd, df) {
  var q = _bq(SS, {
    centreId: ci,
    dateDebut: dd,
    dateFin: df,
    dateCol: 's.date_session',
    orderBy: 's.date_session DESC',
    groupBy: 's.id,s.date_session,v.nom,c.nom,s.statut,s.max_inscriptions',
  });
  var r = await pool.query(q.sql, q.params);
  return _pdf('Export Sessions', SC, SH, r.rows);
}
async function generateSessionsExcel(ci, dd, df) {
  var q = _bq(SS, {
    centreId: ci,
    dateDebut: dd,
    dateFin: df,
    dateCol: 's.date_session',
    orderBy: 's.date_session DESC',
    groupBy: 's.id,s.date_session,v.nom,c.nom,s.statut,s.max_inscriptions',
  });
  var r = await pool.query(q.sql, q.params);
  return _xls('Sessions', SH, SC, r.rows);
}

var AS =
  "SELECT rdv.date_creation,b.nom as bebe_nom,b.prenom as bebe_prenom,s.date_session,v.nom as vaccin_nom,c.nom as centre_nom,rdv.statut FROM rendez_vous rdv JOIN bebe b ON rdv.bebe_id=b.id JOIN session s ON rdv.session_id=s.id JOIN vaccin v ON s.vaccin_id=v.id LEFT JOIN centre c ON s.centre_id=c.id WHERE rdv.statut IN('ABSENT','ANNULE')";
var AC = [
  'date_creation',
  'bebe_nom',
  'bebe_prenom',
  'date_session',
  'vaccin_nom',
  'centre_nom',
  'statut',
];
var AH = ['Date Creation', 'Bebe', 'Prenom', 'Date Session', 'Vaccin', 'Centre', 'Statut'];
async function generateAbsenteismePDF(ci, dd, df) {
  var q = _bq(AS, {
    centreId: ci,
    dateDebut: dd,
    dateFin: df,
    dateCol: 's.date_session',
    orderBy: 's.date_session DESC',
  });
  var r = await pool.query(q.sql, q.params);
  return _pdf('Export Absenteisme', AC, AH, r.rows);
}
async function generateAbsenteismeExcel(ci, dd, df) {
  var q = _bq(AS, {
    centreId: ci,
    dateDebut: dd,
    dateFin: df,
    dateCol: 's.date_session',
    orderBy: 's.date_session DESC',
  });
  var r = await pool.query(q.sql, q.params);
  return _xls('Absenteisme', AH, AC, r.rows);
}

async function generateStockExcel(ci) {
  var sql =
    'SELECT st.quantite_disponible,st.seuil_alerte,v.nom as vaccin_nom,c.nom as centre_nom FROM stock st JOIN vaccin v ON st.vaccin_id=v.id LEFT JOIN centre c ON st.centre_id=c.id WHERE 1=1';
  var p = [];
  var i = 1;
  if (ci) {
    sql += ' AND st.centre_id = $' + i++;
    p.push(ci);
  }
  sql += ' ORDER BY v.nom';
  var r = await pool.query(sql, p);
  return _xls(
    'Stock',
    ['Quantite', 'Seuil', 'Vaccin', 'Centre'],
    ['quantite_disponible', 'seuil_alerte', 'vaccin_nom', 'centre_nom'],
    r.rows,
  );
}

module.exports = {
  generateVaccinationsPDF: generateVaccinationsPDF,
  generateVaccinationsExcel: generateVaccinationsExcel,
  generateSessionsPDF: generateSessionsPDF,
  generateSessionsExcel: generateSessionsExcel,
  generateAbsenteismePDF: generateAbsenteismePDF,
  generateAbsenteismeExcel: generateAbsenteismeExcel,
  generateStockExcel: generateStockExcel,
};
