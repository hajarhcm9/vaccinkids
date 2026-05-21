const day22 = require('../services/exportServiceDay22');

function makeHandler(serviceFn, contentType, filename) {
  return async function(req, res) {
    try {
      if (!req.user || req.user.role !== 'admin') {
        return res.status(403).json({ message: 'Acces refuse' });
      }
      var centreId = req.query.centre_id;
      var dateDebut = req.query.date_debut;
      var dateFin = req.query.date_fin;
      var buffer = await serviceFn(centreId, dateDebut, dateFin);
      res.setHeader('Content-Type', contentType);
      res.setHeader('Content-Disposition', 'attachment; filename=' + filename);
      return res.send(buffer);
    } catch (err) {
      return res.status(500).json({ message: 'Erreur serveur' });
    }
  };
}

exports.exportVaccinationsPDF = makeHandler(day22.generateVaccinationsPDF, 'application/pdf', 'vaccinations.pdf');
exports.exportVaccinationsExcel = makeHandler(day22.generateVaccinationsExcel, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'vaccinations.xlsx');
exports.exportSessionsPDF = makeHandler(day22.generateSessionsPDF, 'application/pdf', 'sessions.pdf');
exports.exportSessionsExcel = makeHandler(day22.generateSessionsExcel, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'sessions.xlsx');
exports.exportAbsenteismePDF = makeHandler(day22.generateAbsenteismePDF, 'application/pdf', 'absenteisme.pdf');
exports.exportAbsenteismeExcel = makeHandler(day22.generateAbsenteismeExcel, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'absenteisme.xlsx');
exports.exportStockExcel = makeHandler(day22.generateStockExcel, 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', 'stock.xlsx');
