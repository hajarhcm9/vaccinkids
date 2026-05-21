const exportService = require('../services/exportService');
const { success, error } = require('../utils/responseHandler');

const exportPDF = async function(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return error(res, 'Acces refuse', 403);
    }
    var centreId = req.query.centre_id || null;
    var month = parseInt(req.query.month) || new Date().getMonth() + 1;
    var year = parseInt(req.query.year) || new Date().getFullYear();
    if (month < 1 || month > 12) {
      return error(res, 'Mois invalide (1-12)', 400);
    }
    if (year < 2020 || year > 2100) {
      return error(res, 'Annee invalide', 400);
    }
    var pdfBuffer = await exportService.generateMonthlyPDF(
      centreId, month, year
    );
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition',
      'attachment; filename=rapport-vaccination-' + month + '-' + year + '.pdf'
    );
    return res.send(pdfBuffer);
  } catch (err) {
     return error(res, err.message, 500);
  }
};

const exportExcel = async function(req, res) {
  try {
    if (req.user.role !== 'admin') {
      return error(res, 'Acces refuse', 403);
    }
    var centreId = req.query.centre_id || null;
    var startDate = req.query.start_date || null;
    var endDate = req.query.end_date || null;
    var buffer = await exportService.generateExcelExport(
      centreId, startDate, endDate
    );
    res.setHeader('Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );
    res.setHeader('Content-Disposition',
      'attachment; filename=export-vaccinations.xlsx'
    );
    return res.send(buffer);
  } catch (err) {
     return error(res, err.message, 500);
  }
};

module.exports = { exportPDF, exportExcel };
