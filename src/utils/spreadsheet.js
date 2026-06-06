const FORMULA_PREFIX = /^[=+\-@]/;

function safeSpreadsheetValue(value) {
  if (typeof value !== 'string') return value;
  return FORMULA_PREFIX.test(value) ? `'${value}` : value;
}

function sanitizeWorksheet(worksheet) {
  worksheet.eachRow((row) => {
    row.eachCell((cell) => {
      if (typeof cell.value === 'string') cell.value = safeSpreadsheetValue(cell.value);
    });
  });
}

module.exports = { safeSpreadsheetValue, sanitizeWorksheet };
